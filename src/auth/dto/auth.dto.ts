import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

// Shared password rule used by sign-up and password reset.
const passwordRule = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export class SignUpDto {
  // The user's display name.
  @IsString()
  @MinLength(2)
  name: string;

  // Email is normalized by the service before it is stored.
  @IsEmail()
  email: string;

  // The password must contain letters and numbers and be at least eight characters.
  @IsString()
  @Matches(passwordRule, {
    message: 'Password must be at least 8 characters and contain letters and numbers',
  })
  password: string;

  // The service compares this field with password before creating the account.
  @IsString()
  confirmPassword: string;

  // For now this accepts an image URL or data URL; storage can be added later.
  @IsOptional()
  @IsString()
  image?: string;
}

export class ConfirmOtpDto {
  // The email associated with the pending operation.
  @IsEmail()
  email: string;

  // OTP is intentionally a string so leading zeroes are preserved.
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class ResetPasswordDto {
  // The short-lived token returned after a valid password-reset OTP.
  @IsString()
  resetToken: string;

  @IsString()
  @Matches(passwordRule, {
    message: 'Password must be at least 8 characters and contain letters and numbers',
  })
  password: string;

  @IsString()
  confirmPassword: string;
}
