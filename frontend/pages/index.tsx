import Layout from "../components/Layout";
import ClaimsTable from "../components/ClaimsTable";

export default function Dashboard() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Duty Drawback Claims
            </h1>
            <p className="text-muted-foreground mt-2">
              Upload documents and track your tariff refund claims
            </p>
          </div>
        </div>

        <ClaimsTable />
      </div>
    </Layout>
  );
}
