
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types/client";

export interface ClientOption {
  id: string;
  name: string;
  email: string;
}

export interface CreateClientData {
  therapist_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: "Active" | "Inactive" | "Pending";
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  notes?: string;
}

export interface UpdateClientData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive" | "Pending";
}

export const getTherapistClients = async (therapistId: string): Promise<ClientOption[]> => {
  const { data, error } = await supabase
    .from("clients")
    .select("id, first_name, last_name, email")
    .eq("therapist_id", therapistId);

  if (error) {
    console.error("Error fetching therapist clients:", error);
    throw error;
  }

  return data.map(client => ({
    id: client.id,
    name: `${client.first_name} ${client.last_name}`,
    email: client.email,
  }));
};

export const clientService = {
  async getClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("first_name", { ascending: true });

    if (error) {
      console.error("Error fetching clients:", error);
      throw error;
    }

    return data.map(client => ({
      id: client.id,
      name: `${client.first_name} ${client.last_name}`,
      firstName: client.first_name,
      lastName: client.last_name,
      email: client.email,
      phone: client.phone || "",
      status: client.status as "Active" | "Inactive" | "Pending",
      image: client.avatar_url || "",
      joinDate: client.join_date ? new Date(client.join_date).toLocaleDateString() : "",
      lastSession: client.last_session ? new Date(client.last_session).toLocaleDateString() : "Never",
    }));
  },

  async createClient(clientData: CreateClientData): Promise<Client> {
    console.log("Creating client with data:", clientData);
    
    const { data, error } = await supabase
      .from("clients")
      .insert([clientData])
      .select()
      .single();

    if (error) {
      console.error("Error creating client:", error);
      throw error;
    }

    console.log("Client created successfully:", data);

    return {
      id: data.id,
      name: `${data.first_name} ${data.last_name}`,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      phone: data.phone || "",
      status: data.status as "Active" | "Inactive" | "Pending",
      image: data.avatar_url || "",
      joinDate: data.join_date ? new Date(data.join_date).toLocaleDateString() : "",
      lastSession: data.last_session ? new Date(data.last_session).toLocaleDateString() : "Never",
    };
  },

  async updateClient(updateData: UpdateClientData): Promise<Client> {
    const { id, ...clientData } = updateData;
    
    const { data, error } = await supabase
      .from("clients")
      .update(clientData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating client:", error);
      throw error;
    }

    return {
      id: data.id,
      name: `${data.first_name} ${data.last_name}`,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      phone: data.phone || "",
      status: data.status as "Active" | "Inactive" | "Pending",
      image: data.avatar_url || "",
      joinDate: data.join_date ? new Date(data.join_date).toLocaleDateString() : "",
      lastSession: data.last_session ? new Date(data.last_session).toLocaleDateString() : "Never",
    };
  },

  async deleteClients(clientIds: string[]): Promise<void> {
    const { error } = await supabase
      .from("clients")
      .delete()
      .in("id", clientIds);

    if (error) {
      console.error("Error deleting clients:", error);
      throw error;
    }
  },

  async getClientById(clientId: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (error) {
      console.error("Error fetching client:", error);
      return null;
    }

    return {
      id: data.id,
      name: `${data.first_name} ${data.last_name}`,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      phone: data.phone || "",
      status: data.status as "Active" | "Inactive" | "Pending",
      image: data.avatar_url || "",
      joinDate: data.join_date ? new Date(data.join_date).toLocaleDateString() : "",
      lastSession: data.last_session ? new Date(data.last_session).toLocaleDateString() : "Never",
    };
  },
};
