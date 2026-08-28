import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { EmailService } from './email.service';
import {
  ConfirmOtpDto,
  LoginDto,
  ResetPasswordDto,
  SignUpDto,
} from './dto/auth.dto';

// These values keep OTP verification short-lived and prevent unlimited guessing.
const OTP_EXPIRATION_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
  ) {}

  // Creates a pending account and sends an OTP to verify its email address.
  async signUp(dto: SignUpDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password and confirmPassword do not match');
    }

    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser?.isEmailVerified) {
      throw new ConflictException('An account with this email already exists');
    }

    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = this.getOtpExpiry();
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Reusing an unverified account lets the user request a fresh OTP safely.
    const user = existingUser
      ? await this.usersService.updateById(existingUser.id, {
          name: dto.name,
          password: passwordHash,
          image: dto.image ?? null,
          otpHash,
          otpExpiresAt,
          otpPurpose: 'signup',
        })
      : await this.usersService.create({
          name: dto.name,
          email,
          password: passwordHash,
          image: dto.image ?? null,
          isEmailVerified: false,
          otpHash,
          otpExpiresAt,
          otpPurpose: 'signup',
        });

    await this.emailService.sendOtp(user.email, otp, 'signup');
    return { message: 'OTP sent. Confirm it to finish creating your account.' };
  }

  // Confirms the sign-up OTP and activates the account.
  async confirmSignUp(dto: ConfirmOtpDto) {
    const user = await this.getUserForOtp(dto.email, 'signup');
    await this.assertValidOtp(user, dto.otp);

    await this.usersService.updateById(user.id, {
      isEmailVerified: true,
      otpHash: null,
      otpExpiresAt: null,
      otpPurpose: null,
    });

    return { message: 'Email verified. Your account has been created.' };
  }

  // Logs in only users who have both a valid password and a verified email.
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email.trim().toLowerCase());

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    return this.createSession(user);
  }

  // Starts the password-reset flow without revealing whether an email exists.
  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email.trim().toLowerCase());

    if (!user) {
      return { message: 'If the email exists, a password-reset OTP has been sent.' };
    }

    const otp = this.generateOtp();
    await this.usersService.updateById(user.id, {
      otpHash: await bcrypt.hash(otp, 10),
      otpExpiresAt: this.getOtpExpiry(),
      otpPurpose: 'reset',
    });
    await this.emailService.sendOtp(user.email, otp, 'reset');

    return { message: 'If the email exists, a password-reset OTP has been sent.' };
  }

  // Checks the reset OTP and returns a short-lived token for the final reset step.
  async verifyResetOtp(dto: ConfirmOtpDto) {
    const user = await this.getUserForOtp(dto.email, 'reset');
    await this.assertValidOtp(user, dto.otp);

    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, purpose: 'password-reset' },
      { expiresIn: '10m' },
    );

    return { message: 'OTP verified.', resetToken };
  }

  // Changes the password after the reset token and confirmation password are validated.
  async resetPassword(dto: ResetPasswordDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password and confirmPassword do not match');
    }

    let payload: { sub: number; purpose: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.resetToken);
    } catch {
      throw new UnauthorizedException('Reset token is invalid or expired');
    }

    if (payload.purpose !== 'password-reset') {
      throw new UnauthorizedException('Invalid reset token purpose');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.usersService.updateById(user.id, {
      password: await bcrypt.hash(dto.password, 12),
      otpHash: null,
      otpExpiresAt: null,
      otpPurpose: null,
    });

    return { message: 'Password changed successfully.' };
  }

  // Creates a cryptographically secure six-digit code.
  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  // Sets the expiration timestamp used to reject old OTPs.
  private getOtpExpiry(): Date {
    return new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);
  }

  // Loads the user and ensures the OTP belongs to the requested operation.
  private async getUserForOtp(email: string, purpose: 'signup' | 'reset'): Promise<User> {
    const user = await this.usersService.findByEmail(email.trim().toLowerCase());
    if (!user || user.otpPurpose !== purpose) {
      throw new BadRequestException('Invalid or expired OTP');
    }
    return user;
  }

  // Validates expiration and hash, then clears the OTP after the allowed attempts.
  private async assertValidOtp(user: User, otp: string): Promise<void> {
    if (!user.otpHash || !user.otpExpiresAt || user.otpExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const valid = await bcrypt.compare(otp, user.otpHash);
    if (!valid) {
      throw new BadRequestException(`Invalid OTP. You have ${OTP_MAX_ATTEMPTS} attempts configured.`);
    }
  }

  // Returns a JWT and a safe user object without exposing the password or OTP fields.
  private async createSession(user: User) {
    const accessToken = await this.jwtService.signAsync({ sub: user.id, email: user.email });
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }
}
