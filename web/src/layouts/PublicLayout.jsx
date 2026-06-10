import Navbar from "../components/Navbar";

export default function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      <div className="container mt-5">
        {children}
      </div>
    </>
  );
}
