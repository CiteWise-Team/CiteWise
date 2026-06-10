import Navbar from "../components/Navbar";

export default function GroupsLayout({ children }) {
  return (
    <>
      <Navbar />

      <div className="container-fluid">
        <main className="px-4 py-4">
          {children}
        </main>
      </div>
    </>
  );
}
