import { redirect } from "next/navigation";

// Les membres sont des comptes utilisateurs : la création passe par /users/create
export default function Page() {
  redirect("/users/create");
}
