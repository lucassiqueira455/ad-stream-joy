export interface Profile {
  id: string;
  created_at: string;
  updated_at: string;
  name: string | null;
  avatar_url: string | null;
  company_name: string | null;
}

export interface Client {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  name: string;
  brand_color: string;
  logo: string | null;
}

export interface DatabaseTables {
  profiles: Profile;
  clients: Client;
}
