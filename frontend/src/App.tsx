import { API_BASE_URL } from "./config";

export default function App() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">School Admission System</h1>
      <p>Backend: {API_BASE_URL}</p>
    </main>
  );
}