import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ConfirmOtpDto,
  LoginDto,
  ResetPasswordDto,
  SignUpDto,
} from './dto/auth.dto';

// These routes expose the complete email-based authentication flow.
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Creates a pending account and sends the sign-up OTP.
  @Post('signup')
  signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  // Activates the account after the user submits the sign-up OTP.
  @Post('signup/confirm-otp')
  confirmSignUp(@Body() dto: ConfirmOtpDto) {
    return this.authService.confirmSignUp(dto);
  }

  // Authenticates a verified user with email and password.
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Sends a password-reset OTP when the email belongs to an account.
  @Post('forgot-password')
  requestPasswordReset(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  // Verifies the reset OTP and returns a short-lived reset token.
  @Post('forgot-password/verify-otp')
  verifyResetOtp(@Body() dto: ConfirmOtpDto) {
    return this.authService.verifyResetOtp(dto);
  }

  // Changes the password after reset-token and password confirmation checks.
  @Post('forgot-password/reset')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
