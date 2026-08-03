import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/User';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    await dbConnect();
    const user = await User.findById(session.id).select('-password');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User no longer exists' }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
