import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  username: string;
  password?: string;
  role: 'admin' | 'employee';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true, 
      lowercase: true 
    },
    password: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['admin', 'employee'], 
      default: 'employee',
      required: true 
    },
  },
  { timestamps: true }
);

// Prevent re-compilation of user model in Next.js development Hot-Reload
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
