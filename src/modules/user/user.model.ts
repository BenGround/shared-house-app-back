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
} from 'sequelize-typescript';
import { Booking } from '../booking/booking.model';
import { compare } from 'bcrypt';

@Table({ tableName: 'Users' })
export class User extends Model {
  @AllowNull(true)
  @Column(DataType.STRING)
  username: string | undefined = undefined;

  @AllowNull(false)
  @Column(DataType.NUMBER)
  roomNumber!: number;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @AllowNull(true)
  @Column(DataType.STRING)
  passwordToken: string | undefined = undefined;

  @AllowNull(true)
  @Column(DataType.STRING)
  email: string | undefined = undefined;

  @AllowNull(false)
  @Column(DataType.STRING)
  password!: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
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
