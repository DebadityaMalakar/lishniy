import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// Initialize Supabase client with server-side environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl && !!supabaseServiceKey) {
  throw new Error('Missing Supabase URL environment variable');
} else if (!supabaseServiceKey && !!supabaseUrl) {
  throw new Error('Missing Supabase Service Role Key environment variable');
} else if (!supabaseUrl && !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
};

const supabase = createClient(supabaseUrl as string, supabaseServiceKey as string);

// Allowed tables/operations for security
const ALLOWED_TABLES = [
  'entries',
  'vote_history',
  'current_vote',
  'votes'
];

const ALLOWED_METHODS = ['GET', 'POST'];

export default async function handler(request: NextRequest) {
  // Only allow GET and POST
  if (!ALLOWED_METHODS.includes(request.method)) {
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const id = searchParams.get('id');
    const range = searchParams.get('range');
    const limit = searchParams.get('limit');
    const orderBy = searchParams.get('orderBy');
    const orderDirection = searchParams.get('orderDirection') || 'asc';
    const select = searchParams.get('select') || '*';
    
    // Validate table
    if (!table || !ALLOWED_TABLES.includes(table)) {
      return NextResponse.json(
        { error: 'Invalid or missing table parameter' },
        { status: 400 }
      );
    }

    // Handle different request methods
    if (request.method === 'GET') {
      let query = supabase.from(table).select(select);

      // Apply filters
      if (id) {
        query = query.eq('id', id);
      }

      // Handle count-only requests
      if (searchParams.get('count') === 'true') {
        query = supabase.from(table).select('*', { count: 'exact', head: true });
      }

      // Apply range pagination
      if (range) {
        const [start, end] = range.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          query = query.range(start, end);
        }
      }

      // Apply limit
      if (limit) {
        const limitNum = parseInt(limit);
        if (!isNaN(limitNum)) {
          query = query.limit(limitNum);
        }
      }

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy, { ascending: orderDirection === 'asc' });
      }

      // Apply filters from query params
      // Format: filter_column=value or filter_column__eq=value, filter_column__ilike=%value%
      const filters: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        if (key.startsWith('filter_')) {
          filters[key] = value;
        }
      });

      // Parse and apply filters
      Object.entries(filters).forEach(([key, value]) => {
        const match = key.match(/^filter_(.+?)(?:__(eq|neq|gt|gte|lt|lte|like|ilike|in))?$/);
        if (match) {
          const [_, column, operator = 'eq'] = match;
          
          switch (operator) {
            case 'eq':
              query = query.eq(column, value);
              break;
            case 'neq':
              query = query.neq(column, value);
              break;
            case 'gt':
              query = query.gt(column, value);
              break;
            case 'gte':
              query = query.gte(column, value);
              break;
            case 'lt':
              query = query.lt(column, value);
              break;
            case 'lte':
              query = query.lte(column, value);
              break;
            case 'like':
              query = query.like(column, value);
              break;
            case 'ilike':
              query = query.ilike(column, value);
              break;
            case 'in':
              query = query.in(column, value.split(','));
              break;
          }
        }
      });

      const { data, error, count } = await query;

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({ data, count });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { action = 'insert', data, match } = body;

      // Validate action
      if (!['insert', 'upsert', 'update', 'delete'].includes(action)) {
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
      }

      let result;
      switch (action) {
        case 'insert':
          result = await supabase.from(table).insert(data).select();
          break;
        case 'upsert':
          result = await supabase.from(table).upsert(data).select();
          break;
        case 'update':
          if (!match) {
            return NextResponse.json(
              { error: 'Match object required for update' },
              { status: 400 }
            );
          }
          result = await supabase.from(table).update(data).match(match).select();
          break;
        case 'delete':
          if (!match) {
            return NextResponse.json(
              { error: 'Match object required for delete' },
              { status: 400 }
            );
          }
          result = await supabase.from(table).delete().match(match);
          break;
      }

      if (!result) {
        return NextResponse.json(
          { error: 'Unexpected error: No result returned from Supabase' },
          { status: 500 }
        );
      }

      if (result.error) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({ data: result.data });
    }

  } catch (error) {
    console.error('Supabase proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const POST = handler;