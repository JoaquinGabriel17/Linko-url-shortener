import mongoose from'mongoose';
import { nanoid } from 'nanoid';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    trim: true,
    default: () => `usuario${nanoid(8)}`
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const User = mongoose.model('User', userSchema);
export default User;