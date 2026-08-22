import Navbar from "../components/Navbar";

export default function GroupsLayout({ children }) {
  return (
    <>
      <Navbar />

      <div className="groups-shell">
        <main>
          {children}
        </main>
      </div>
    </>
  );
}
