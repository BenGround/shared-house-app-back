import {
  AllowNull,
  BeforeCreate,
  BeforeUpdate,
  Column,
  DataType,
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
  @AllowNull(true)
  @Column(DataType.STRING)
  username: string | undefined = undefined;

  @AllowNull(false)
  @Column
  roomNumber!: number;

  @AllowNull(false)
  @Default(false)
  @Column
  isSet!: boolean;

  @AllowNull(true)
  @Column(DataType.STRING)
  passwordToken: string | undefined = undefined;

  @AllowNull(true)
  @Column(DataType.STRING)
  email: string | undefined = undefined;

  @AllowNull(false)
  @Column
  password!: string;

  @AllowNull(false)
  @Default(false)
  @Column
  isAdmin!: boolean;

  @HasMany(() => Booking)
  bookings?: Booking[];

  @AllowNull(true)
  @Column(DataType.STRING)
  profilePicture?: String;

  @BeforeCreate
  @BeforeUpdate
  static beforeCreateHook(instance: User): void {
    if (instance.dataValues.username) {
      instance.username = instance.dataValues.username.trim();
    }
  }

  comparePassword(password: string): Promise<boolean> {
    return compare(password, this.dataValues.password).catch((err) => {
      console.error(err);
      return false;
    });
  }
}
