import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import FileExplorer from "@/components/FileExplorer";
import { useClaim } from "@/hooks/use-api";

export default function ClaimDetailPage() {
  const router = useRouter();
  const { claimId } = router.query;
  const { claim, isLoading, isError } = useClaim(claimId as string);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-muted-foreground">Loading claim...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (isError || !claim) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-muted-foreground mb-2">
              Claim Not Found
            </h1>
            <p className="text-muted-foreground">
              The claim you're looking for doesn't exist or there was an error
              loading it.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <FileExplorer claimId={claim.id} claimName={claim.name} />
      </div>
    </Layout>
  );
}
