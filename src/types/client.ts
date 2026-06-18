
export type Client = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive" | "Pending";
  joinDate: string;
  lastSession: string;
  image?: string;
};
