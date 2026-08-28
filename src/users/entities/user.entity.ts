import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// This entity stores the user account and temporary email-verification data.
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  // Passwords are stored as bcrypt hashes, never as plain text.
  @Column()
  password: string;

  // The image is stored as a URL or data URL until file storage is added.
  @Column({ type: 'text', nullable: true })
  image: string | null;

  // These fields remain available for future social-login integrations.
  @Column({ nullable: true })
  googleId: string | null;

  @Column({ nullable: true })
  facebookId: string | null;

  // Users cannot log in until they confirm the email OTP.
  @Column({ default: false })
  isEmailVerified: boolean;

  // Only a hash of the latest OTP is stored in the database.
  @Column({ nullable: true })
  otpHash: string | null;

  // OTPs expire after a short period and cannot be reused.
  @Column({ type: 'datetime', nullable: true })
  otpExpiresAt: Date | null;

  // This prevents a sign-up OTP from being used for password reset.
  @Column({ nullable: true })
  otpPurpose: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}