import DashboardLayout from "../layouts/GroupsLayout";

export default function Upload() {
  return (
    <DashboardLayout>
      <h3 className="mb-3">Upload Paper</h3>

      <div className="card">
        <div className="card-body">
          <form>
            <input className="form-control mb-3" />
            <button className="btn btn-primary">Submit</button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
