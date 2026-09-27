import Navbar from "../components/Navbar";

export default function GroupsLayout({ children }) {
  return (
    <div className="groups-layout-wrapper">
      <Navbar />

      <div className="groups-shell">
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
