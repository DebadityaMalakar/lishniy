// app/api/supabase/client.ts
// Browser-side client that uses the proxy instead of direct Supabase connection

interface ProxyGetOptions {
  table: string;
  id?: string;
  select?: string;
  range?: [number, number];
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, string | { operator: string; value: string }>;
  count?: boolean;
}

interface ProxyPostOptions {
  table: string;
  action?: 'insert' | 'upsert' | 'update' | 'delete';
  data?: any;
  match?: Record<string, any>;
}

class SupabaseProxyClient {
  private baseUrl = '/api/supabase';

  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'filters' && typeof value === 'object') {
          Object.entries(value).forEach(([filterKey, filterValue]) => {
            if (filterValue !== null && typeof filterValue === 'object' && 'operator' in filterValue) {
              const { operator, value } = filterValue as { operator: string; value: string };
              searchParams.append(`filter_${filterKey}__${operator}`, value);
            } else {
              searchParams.append(`filter_${filterKey}`, String(filterValue));
            }
          });
        } else if (key === 'range' && Array.isArray(value)) {
          searchParams.append('range', `${value[0]}-${value[1]}`);
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
    
    return searchParams.toString();
  }

  async from(table: string) {
    return {
      select: async (columns = '*', options: { count?: boolean } = {}) => {
        const queryString = this.buildQueryString({
          table,
          select: columns,
          count: options.count ? 'true' : undefined
        });
        
        const response = await fetch(`${this.baseUrl}?${queryString}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch data');
        }
        
        return {
          data: data.data,
          count: data.count,
          error: null
        };
      },

      eq: async (column: string, value: any) => {
        const filters = { [column]: value };
        const queryString = this.buildQueryString({ table, filters });
        
        const response = await fetch(`${this.baseUrl}?${queryString}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch data');
        }
        
        return { data: data.data, error: null };
      },

      single: async () => {
        const response = await fetch(`${this.baseUrl}?${this.buildQueryString({ table })}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch data');
        }
        
        return {
          data: data.data?.[0] || null,
          error: data.data?.length === 0 ? { code: 'PGRST116' } : null
        };
      },

      insert: async (data: any) => {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table, action: 'insert', data })
        });
        
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to insert data');
        }
        
        return { data: result.data, error: null };
      },

      upsert: async (data: any) => {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table, action: 'upsert', data })
        });
        
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to upsert data');
        }
        
        return { data: result.data, error: null };
      },

      update: async (data: any) => {
        return {
          match: (match: Record<string, any>) => 
            fetch(this.baseUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ table, action: 'update', data, match })
            }).then(async res => {
              const result = await res.json();
              if (!res.ok) throw new Error(result.error || 'Failed to update data');
              return { data: result.data, error: null };
            })
        };
      },

      delete: async () => {
        return {
          match: (match: Record<string, any>) => 
            fetch(this.baseUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ table, action: 'delete', match })
            }).then(async res => {
              const result = await res.json();
              if (!res.ok) throw new Error(result.error || 'Failed to delete data');
              return { data: result.data, error: null };
            })
        };
      },

      range: (start: number, end: number) => {
        const queryString = this.buildQueryString({ table, range: [start, end] });
        return fetch(`${this.baseUrl}?${queryString}`).then(res => res.json());
      },

      limit: (count: number) => {
        const queryString = this.buildQueryString({ table, limit: count });
        return fetch(`${this.baseUrl}?${queryString}`).then(res => res.json());
      },

      order: (column: string, options: { ascending?: boolean } = {}) => {
        const queryString = this.buildQueryString({
          table,
          orderBy: column,
          orderDirection: options.ascending ? 'asc' : 'desc'
        });
        return fetch(`${this.baseUrl}?${queryString}`).then(res => res.json());
      }
    };
  }

  channel(name: string) {
    // For realtime subscriptions, you might need to implement a WebSocket proxy
    // or use the direct Supabase client for realtime features only
    console.warn('Realtime subscriptions not supported via proxy. Consider using direct Supabase client for realtime features.');
    return {
      on: () => this,
      subscribe: () => this
    };
  }

  removeChannel() {
    return this;
  }
}

export const supabaseProxy = new SupabaseProxyClient();