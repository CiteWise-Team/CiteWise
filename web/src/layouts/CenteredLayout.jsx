export default function CenteredLayout({ children }) {
  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      {children}
    </div>
  );
}
s