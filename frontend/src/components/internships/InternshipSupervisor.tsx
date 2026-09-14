"use client";

interface InternshipSupervisorProps {
  name: string;
  department: string;
  email?: string;
  phone?: string;
}

export default function InternshipSupervisor({
  name,
  department,
  email,
  phone,
}: InternshipSupervisorProps) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold">
        Encadrant
      </h3>

      <div className="space-y-3 text-sm">
        <div>
          <p className="text-gray-500">Nom</p>
          <p className="font-medium">{name}</p>
        </div>

        <div>
          <p className="text-gray-500">Département</p>
          <p className="font-medium">{department}</p>
        </div>

        {email && (
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium">{email}</p>
          </div>
        )}

        {phone && (
          <div>
            <p className="text-gray-500">Téléphone</p>
            <p className="font-medium">{phone}</p>
          </div>
        )}
      </div>
    </div>
  );
}