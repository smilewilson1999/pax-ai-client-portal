import { useRouter } from "next/router";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Edit, Trash2, FileText, Download, X } from "lucide-react";
import { useClaims } from "../hooks/use-api";
import { cn } from "../lib/utils";
import CreateClaimDialog from "./CreateClaimDialog";

type SortKey = "name" | "createdAt" | "status";
type SortDirection = "asc" | "desc";

export default function ClaimsTable() {
  const router = useRouter();
  const { claims, isLoading, isError, renameClaim, deleteClaim } = useClaims();

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set());

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameClaimId, setRenameClaimId] = useState<string>("");
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClaims(new Set(claims?.map((c) => c.id) || []));
    } else {
      setSelectedClaims(new Set());
    }
  };

  const handleSelectClaim = (claimId: string, checked: boolean) => {
    const newSelected = new Set(selectedClaims);
    if (checked) {
      newSelected.add(claimId);
    } else {
      newSelected.delete(claimId);
    }
    setSelectedClaims(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedClaims.size === 0) return;

    if (
      confirm(
        `Are you sure you want to delete ${selectedClaims.size} claim(s)? This action cannot be undone.`
      )
    ) {
      try {
        await Promise.all(
          Array.from(selectedClaims).map((claimId) => deleteClaim(claimId))
        );
        setSelectedClaims(new Set());
      } catch (error) {
        console.error("Error deleting claims:", error);
      }
    }
  };

  const handleRowClick = (claimId: string) => {
    router.push(`/claims/${claimId}`);
  };

  const handleRename = (claimId: string, currentName: string) => {
    setRenameClaimId(claimId);
    setRenameValue(currentName);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (!renameValue.trim() || !renameClaimId) return;

    setIsRenaming(true);
    try {
      await renameClaim(renameClaimId, renameValue.trim());
      setRenameDialogOpen(false);
      setRenameClaimId("");
      setRenameValue("");
    } catch (error) {
      console.error("Error renaming claim:", error);
    } finally {
      setIsRenaming(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ActionRequired":
        return "bg-destructive/10 text-destructive";
      case "InProgress":
        return "bg-warning/10 text-warning";
      case "Completed":
        return "bg-success/10 text-success";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-md border border-border p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading claims...</div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-card rounded-md border border-border p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-destructive">Error loading claims</div>
        </div>
      </div>
    );
  }

  if (!claims || claims.length === 0) {
    return (
      <div className="space-y-4">
        {/* Header with Create Button - Always show even when empty */}
        <div className="rounded-md p-4 flex items-center justify-between min-h-[4rem] bg-muted/50">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold">Claims Management</h2>
          </div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center cursor-pointer bg-purple-600 hover:bg-purple-700"
            >
              <FileText className="h-4 w-4" />
              <span>Create New Claim</span>
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-card rounded-md border border-border p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-foreground">
                No claims yet
              </h3>
              <p className="text-muted-foreground max-w-md">
                Get started by creating your first claim for pre-preparation
              </p>
            </div>
          </div>
        </div>

        {/* Create Claim Dialog */}
        <CreateClaimDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      </div>
    );
  }

  const sortedClaims = [...claims].sort((a, b) => {
    let aValue: string;
    let bValue: string;

    switch (sortKey) {
      case "name":
        aValue = a.name;
        bValue = b.name;
        break;
      case "createdAt":
        aValue = a.createdAt;
        bValue = b.createdAt;
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
    }

    if (sortDirection === "asc") {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  const isAllSelected = selectedClaims.size === claims.length;
  const isIndeterminate =
    selectedClaims.size > 0 && selectedClaims.size < claims.length;

  return (
    <div className="space-y-4">
      {/* Integrated Header and Action Bar */}
      <div
        className={cn(
          "rounded-md p-4 flex items-center justify-between min-h-[4rem]",
          selectedClaims.size > 0 ? "bg-purple-600 text-white" : "bg-muted/50"
        )}
      >
        {selectedClaims.size > 0 ? (
          // Selection Mode
          <>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedClaims(new Set())}
                className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4 stroke-2" />
              </Button>
              <span className="font-medium text-white">
                {selectedClaims.size} selected
              </span>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className={cn(
                  "flex items-center",
                  "bg-transparent text-white border border-white hover:bg-white/20 hover:text-white",
                  "cursor-pointer"
                )}
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </Button>
            </div>
          </>
        ) : (
          // Default Mode - Claims Overview
          <>
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold">Claims Management</h2>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center cursor-pointer bg-purple-600 hover:bg-purple-700"
              >
                <FileText className="h-4 w-4" />
                <span>Create New Claim</span>
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Claims List */}
      <div className="bg-card rounded-md border border-border overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-5 gap-4 p-4 bg-muted/30 border-b border-border text-sm font-medium text-muted-foreground">
          <div className="col-span-1 flex items-center">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = isIndeterminate;
              }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-gray-300 cursor-pointer"
            />
          </div>
          <div
            className="col-span-2 cursor-pointer hover:text-foreground transition-colors"
            onClick={() => handleSort("name")}
          >
            Claim Name
            {sortKey === "name" && (
              <span className="ml-1">
                {sortDirection === "asc" ? "↑" : "↓"}
              </span>
            )}
          </div>
          <div
            className="col-span-1 cursor-pointer hover:text-foreground transition-colors"
            onClick={() => handleSort("createdAt")}
          >
            Created
            {sortKey === "createdAt" && (
              <span className="ml-1">
                {sortDirection === "asc" ? "↑" : "↓"}
              </span>
            )}
          </div>
          <div
            className="col-span-1 cursor-pointer hover:text-foreground transition-colors"
            onClick={() => handleSort("status")}
          >
            Status
            {sortKey === "status" && (
              <span className="ml-1">
                {sortDirection === "asc" ? "↑" : "↓"}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="divide-y divide-border">
          {sortedClaims.map((claim) => (
            <div
              key={claim.id}
              className="grid grid-cols-5 gap-4 p-4 hover:bg-muted/20 transition-colors"
            >
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedClaims.has(claim.id)}
                  onChange={(e) =>
                    handleSelectClaim(claim.id, e.target.checked)
                  }
                  className="rounded border-gray-300 cursor-pointer"
                />
              </div>
              <div className="col-span-2 flex items-center space-x-2">
                <FileText className="h-4 w-4 text-primary" />
                <div className="flex items-center group">
                  <button
                    onClick={() => handleRowClick(claim.id)}
                    className="text-left hover:underline cursor-pointer"
                  >
                    {claim.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => handleRename(claim.id, claim.name)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="col-span-1 flex items-center text-sm text-muted-foreground">
                {formatDate(claim.createdAt)}
              </div>
              <div className="col-span-1 flex items-center">
                <span
                  className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    getStatusBadgeClass(claim.status)
                  )}
                >
                  {claim.status === "InProgress" ? "In Progress" : claim.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Claim Dialog */}
      <CreateClaimDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Claim</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-input">Claim Name</Label>
              <Input
                id="rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleRenameSubmit();
                  }
                }}
                placeholder="Enter new claim name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
              disabled={isRenaming}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameSubmit}
              disabled={!renameValue.trim() || isRenaming}
              className="cursor-pointer"
            >
              {isRenaming ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
