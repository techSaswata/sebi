import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/api';
import { bondSeeder } from '@/services/bond-seeder';

// POST /api/admin/seed-bonds - Seed bonds from Aspero API (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes(process.env.ADMIN_API_KEY || '')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    const { action } = await request.json().catch(() => ({}));

    if (action === 'clear') {
      // Clear all bonds
      await bondSeeder.clearBonds();
      return NextResponse.json({
        success: true,
        message: 'All bonds cleared successfully'
      } as ApiResponse);
    }

    // Get stats before seeding
    const statsBefore = await bondSeeder.getBondStats();

    // Seed bonds from Aspero API
    await bondSeeder.seedBonds();

    // Get stats after seeding
    const statsAfter = await bondSeeder.getBondStats();

    return NextResponse.json({
      success: true,
      message: 'Bonds seeded successfully',
      data: {
        before: statsBefore,
        after: statsAfter,
        changes: {
          bonds_added: parseInt(statsAfter.total_bonds) - parseInt(statsBefore.total_bonds)
        }
      }
    } as ApiResponse);

  } catch (error) {
    console.error('Error seeding bonds:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to seed bonds' 
      } as ApiResponse,
      { status: 500 }
    );
  }
}

// GET /api/admin/seed-bonds - Get bond statistics
export async function GET(request: NextRequest) {
  try {
    // Admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes(process.env.ADMIN_API_KEY || '')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    const stats = await bondSeeder.getBondStats();

    return NextResponse.json({
      success: true,
      data: stats
    } as ApiResponse);

  } catch (error) {
    console.error('Error getting bond stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get bond statistics' } as ApiResponse,
      { status: 500 }
    );
  }
}
