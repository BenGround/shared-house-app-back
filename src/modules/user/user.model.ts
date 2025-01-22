import {
  AllowNull,
  BeforeCreate,
  BeforeUpdate,
  Column,
  Default,
  HasMany,
  Model,
  Table,
  Unique,
} from 'sequelize-typescript';
import { Booking } from '../booking/booking.model';
import { compare } from 'bcrypt';

@Table
export class User extends Model {
  @Unique
  @AllowNull(false)
  @Column
  username!: string;

  @AllowNull(false)
  @Column
  roomNumber!: number;

  @AllowNull(false)
  @Column
  email!: string;

  @AllowNull(false)
  @Column
  password!: string;

  @AllowNull(false)
  @Default(false)
  @Column
  isAdmin!: boolean;

  @HasMany(() => Booking)
  bookings?: Booking[];

  @BeforeCreate
  @BeforeUpdate
  static beforeCreateHook(instance: User): void {
    instance.username = instance.username.trim();
  }

  comparePasswrod(password: string): Promise<boolean> {
    return compare(password, this.password).catch((err) => {
      console.error(err);
      return false;
    });
  }
}
