"use client";

interface AttendanceRecord {
  date: string;
  status: "present" | "absent" | "late";
  comment?: string;
}

interface InternshipAttendanceProps {
  records: AttendanceRecord[];
}

export default function InternshipAttendance({
  records,
}: InternshipAttendanceProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="border-b p-5">
        <h2 className="font-semibold">
          Suivi des présences
        </h2>

        <p className="text-sm text-gray-500">
          Présence quotidienne du stagiaire.
        </p>
      </div>

      <div className="divide-y">
        {records.map((record, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4"
          >
            <div>
              <p className="font-medium">
                {record.date}
              </p>

              {record.comment && (
                <p className="text-xs text-gray-500">
                  {record.comment}
                </p>
              )}
            </div>

            <Status status={record.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Status({
  status,
}: {
  status: "present" | "absent" | "late";
}) {
  const config = {
    present: {
      label: "Présent",
      className: "bg-green-100 text-green-700",
    },
    absent: {
      label: "Absent",
      className: "bg-red-100 text-red-700",
    },
    late: {
      label: "Retard",
      className: "bg-yellow-100 text-yellow-700",
    },
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${config[status].className}`}
    >
      {config[status].label}
    </span>
  );
}