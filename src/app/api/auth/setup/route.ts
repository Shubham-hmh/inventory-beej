import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/User';
import { signToken } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const count = await User.countDocuments({});
    return NextResponse.json({ success: true, hasAdmin: count > 0 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const count = await User.countDocuments({});
    
    if (count > 0) {
      return NextResponse.json(
        { success: false, error: 'Setup is already complete. Admin exists.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, username, password } = body;

    if (!name || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, Username, and Password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const primaryAdmin = await User.create({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      password: hashedPassword,
      role: 'admin',
    });

    const token = signToken({
      id: primaryAdmin._id.toString(),
      name: primaryAdmin.name,
      username: primaryAdmin.username,
      role: primaryAdmin.role,
    });

    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return NextResponse.json({
      success: true,
      data: {
        id: primaryAdmin._id,
        name: primaryAdmin.name,
        username: primaryAdmin.username,
        role: primaryAdmin.role,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
