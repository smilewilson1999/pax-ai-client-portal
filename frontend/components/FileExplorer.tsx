import React, { useState, useRef } from "react";
import {
  ChevronRight,
  Home,
  FolderPlus,
  FileUp,
  Folder,
  File,
  Check,
  AlertTriangle,
  X,
  Download,
  Trash2,
  Clock,
  Edit,
  FileImage,
  FileText as FileTextIcon,
} from "lucide-react";
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
import { useClaimDocuments } from "../hooks/use-api";
import { DocumentNode } from "../types";
import { cn } from "../lib/utils";
import { useAuth } from "@clerk/nextjs";
import { apiService } from "../lib/api-service";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface FileExplorerProps {
  claimId: string;
  claimName: string;
}

const getStatusIcon = (status: string, type: "folder" | "file") => {
  switch (status) {
    case "Validated":
      return <Check className="h-4 w-4 text-green-500" />;
    case "Processing":
      return <Clock className="h-4 w-4 text-blue-500" />;
    case "Error":
      return <X className="h-4 w-4 text-red-500" />;
    case "Uploaded":
      // For folders, "Uploaded" is a normal state (green)
      // For files, "Uploaded" means waiting for processing (blue)
      if (type === "folder") {
        return <Check className="h-4 w-4 text-green-500" />;
      } else {
        return <Clock className="h-4 w-4 text-blue-500" />;
      }
    default:
      return null;
  }
};

const getStatusTooltip = (status: string, type: "folder" | "file") => {
  switch (status) {
    case "Validated":
      return "Document has been validated and meets requirements";
    case "Processing":
      return "Document is being processed, please wait";
    case "Error":
      return "Document processing failed, needs to be re-uploaded or fixed";
    case "Uploaded":
      if (type === "folder") {
        return "Folder has been created successfully";
      } else {
        return "Document uploaded, waiting for system processing";
      }
    default:
      return "Unknown status";
  }
};

const getFileIcon = (node: DocumentNode) => {
  if (node.type === "folder") {
    return <Folder className="h-4 w-4 text-blue-500" />;
  }

  // Check file extension or fileType for images
  const fileExtension =
    node.fileType?.toLowerCase() ||
    (node.name.includes(".") ? node.name.split(".").pop()?.toLowerCase() : "");

  const imageExtensions = ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"];
  const textExtensions = ["txt", "pdf", "doc", "docx", "csv", "json"];

  if (fileExtension && imageExtensions.includes(fileExtension)) {
    return <FileImage className="h-4 w-4 text-purple-500" />;
  }

  if (fileExtension && textExtensions.includes(fileExtension)) {
    return <FileTextIcon className="h-4 w-4 text-green-500" />;
  }

  return <File className="h-4 w-4 text-gray-500" />;
};

const formatDate = (dateString: string) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

const buildFlatList = (
  nodes: DocumentNode[],
  parentId: string | null = null
): DocumentNode[] => {
  const result: DocumentNode[] = [];

  nodes.forEach((node) => {
    if (node.parentId === parentId) {
      result.push(node);
      if (node.children && node.children.length > 0) {
        result.push(...buildFlatList(node.children, node.id));
      }
    }
  });

  return result;
};

export default function FileExplorer({
  claimId,
  claimName,
}: FileExplorerProps) {
  const { getToken } = useAuth();
  const {
    documents,
    isLoading,
    isError,
    createFolder,
    uploadFile,
    renameDocument,
    deleteDocument,
    moveDocument,
  } = useClaimDocuments(claimId);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    Array<{ id: string | null; name: string }>
  >([{ id: null, name: "Root" }]);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameItemId, setRenameItemId] = useState<string>("");
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<DocumentNode | null>(null);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">{claimName}</h1>
        </div>
        <div className="bg-card rounded-md border border-border p-8">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading documents...</div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">{claimName}</h1>
        </div>
        <div className="bg-card rounded-md border border-border p-8">
          <div className="flex items-center justify-center">
            <div className="text-destructive">Error loading documents</div>
          </div>
        </div>
      </div>
    );
  }

  // Get current folder contents
  const currentFolderContents = documents
    ? buildFlatList(documents).filter(
        (item) => item.parentId === currentFolderId
      )
    : [];

  const currentFolders = currentFolderContents.filter(
    (item) => item.type === "folder"
  );
  const currentFiles = currentFolderContents.filter(
    (item) => item.type === "file"
  );

  const allCurrentItems = [...currentFolders, ...currentFiles];

  // Selection functions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(allCurrentItems.map((item) => item.id));
      setSelectedItems(allIds);
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelection = new Set(selectedItems);
    if (checked) {
      newSelection.add(itemId);
    } else {
      newSelection.delete(itemId);
    }
    setSelectedItems(newSelection);
  };

  const isAllSelected =
    allCurrentItems.length > 0 && selectedItems.size === allCurrentItems.length;
  const isIndeterminate =
    selectedItems.size > 0 && selectedItems.size < allCurrentItems.length;

  // Get selected items info
  const selectedItemsData = allCurrentItems.filter((item) =>
    selectedItems.has(item.id)
  );
  const selectedFiles = selectedItemsData.filter(
    (item) => item.type === "file"
  );

  // Navigation functions
  const navigateToFolder = (folderId: string | null, folderName: string) => {
    setCurrentFolderId(folderId);

    if (folderId === null) {
      // Going to root
      setBreadcrumbs([{ id: null, name: "Root" }]);
    } else {
      // For now, simple breadcrumb (can be enhanced to show full path)
      setBreadcrumbs([
        { id: null, name: "Root" },
        { id: folderId, name: folderName },
      ]);
    }
  };

  const navigateToBreadcrumb = (targetId: string | null) => {
    if (targetId === null) {
      navigateToFolder(null, "Root");
    } else {
      const folder = allCurrentItems.find((item) => item.id === targetId);
      if (folder) {
        navigateToFolder(targetId, folder.name);
      }
    }
  };

  // File operations
  const handleCreateFolder = () => {
    setShowNewFolderDialog(true);
  };

  const confirmCreateFolder = async () => {
    if (newFolderName.trim()) {
      try {
        await createFolder(currentFolderId, newFolderName.trim());
        setNewFolderName("");
        setShowNewFolderDialog(false);
      } catch (error) {
        console.error("Error creating folder:", error);
      }
    }
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;

    if (files) {
      try {
        for (const file of Array.from(files)) {
          await uploadFile(currentFolderId, file);
        }
      } catch (error) {
        console.error("Error uploading files:", error);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const itemId of Array.from(selectedItems)) {
        await deleteDocument(itemId);
      }
      setSelectedItems(new Set());
    } catch (error) {
      console.error("Error deleting items:", error);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedItems.size === 0) return;

    // Filter only files for download (exclude folders)
    const filesToDownload = allCurrentItems.filter(
      (item) => selectedItems.has(item.id) && item.type === "file"
    );

    if (filesToDownload.length === 0) {
      alert("No files selected for download. Only files can be downloaded.");
      return;
    }

    try {
      // Download each file individually
      await Promise.all(
        filesToDownload.map((file) => handleFileDownload(file.id, file.name))
      );
    } catch (error) {
      console.error("Error downloading files:", error);
      alert("Error downloading some files. Please try again.");
    }
  };

  const handleRename = (itemId: string, currentName: string) => {
    setRenameItemId(itemId);
    setRenameValue(currentName);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (!renameValue.trim() || !renameItemId) return;

    setIsRenaming(true);
    try {
      await renameDocument(renameItemId, renameValue.trim());
      setRenameDialogOpen(false);
      setRenameItemId("");
      setRenameValue("");
    } catch (error) {
      console.error("Error renaming item:", error);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleFileDownload = async (fileId: string, fileName: string) => {
    try {
      const token = await getToken();
      if (!token) {
        alert("Please log in first");
        return;
      }

      const blob = await apiService.downloadFile(token, fileId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (error instanceof Error && error.message.includes("501")) {
        alert(
          "File download feature not yet implemented. Need to configure Supabase Storage for file storage and serving."
        );
      } else {
        alert("Error downloading file, please try again later.");
      }
    }
  };

  const handleFilePreview = async (file: DocumentNode) => {
    setPreviewFile(file);
    setPreviewDialogOpen(true);
    setIsLoadingPreview(true);
    setPreviewContent("");

    try {
      const token = await getToken();
      if (!token) {
        alert("Please log in first");
        return;
      }

      // Determine file type from extension
      const fileExtension =
        file.fileType?.toLowerCase() ||
        (file.name.includes(".")
          ? file.name.split(".").pop()?.toLowerCase()
          : "");

      const imageExtensions = [
        "png",
        "jpg",
        "jpeg",
        "gif",
        "bmp",
        "webp",
        "svg",
      ];

      // Use optimized preview endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/documents/${file.id}/preview`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load file for preview");
      }

      if (fileExtension && imageExtensions.includes(fileExtension)) {
        // For images, create object URL
        const blob = await response.blob();
        const imageUrl = window.URL.createObjectURL(blob);
        setPreviewContent(imageUrl);
      } else {
        // For non-images, show as text if possible
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("text/") || contentType.includes("json")) {
          const text = await response.text();
          setPreviewContent(text);
        } else {
          setPreviewContent("Preview not available for this file type.");
        }
      }
    } catch (error) {
      console.error("Error loading file preview:", error);
      setPreviewContent("Error loading file preview.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{claimName}</h1>
      </div>

      {/* Integrated Header and Action Bar */}
      <div
        className={cn(
          "rounded-md p-4 flex items-center justify-between min-h-[4rem]",
          selectedItems.size > 0 ? "bg-purple-600 text-white" : "bg-muted/50"
        )}
      >
        {selectedItems.size > 0 ? (
          // Selection Mode
          <>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedItems(new Set())}
                className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4 stroke-2" />
              </Button>
              <span className="font-medium text-white">
                {selectedItems.size} selected
              </span>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDownload}
                className={cn(
                  "flex items-center",
                  "bg-white text-purple-600 border border-white hover:bg-purple-50 hover:text-purple-700",
                  "cursor-pointer"
                )}
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </Button>
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
          // Default Mode
          <>
            {/* Breadcrumbs */}
            <div className="flex items-center space-x-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.id || "root"}>
                  {index > 0 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <button
                    onClick={() => navigateToBreadcrumb(crumb.id)}
                    className={cn(
                      "text-sm hover:underline cursor-pointer",
                      index === breadcrumbs.length - 1
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateFolder}
                className="flex items-center cursor-pointer"
              >
                <FolderPlus className="h-4 w-4" />
                <span>New Folder</span>
              </Button>
              <Button
                size="sm"
                onClick={handleUploadFile}
                className="flex items-center cursor-pointer bg-purple-600 hover:bg-purple-700"
              >
                <FileUp className="h-4 w-4" />
                <span>Upload File</span>
              </Button>
            </div>
          </>
        )}
      </div>

      {/* File/Folder List */}
      <div className="bg-card rounded-md border border-border overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-11 gap-4 p-4 bg-muted/30 border-b border-border text-sm font-medium text-muted-foreground">
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
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Modified</div>
          <div className="col-span-2">Status</div>
        </div>

        {/* Content */}
        <div className="divide-y divide-border">
          {allCurrentItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="mb-2">No files or folders in this location</div>
              <div className="text-sm">
                Upload files or create folders to get started
              </div>
            </div>
          ) : (
            allCurrentItems.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-11 gap-4 p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={(e) =>
                      handleSelectItem(item.id, e.target.checked)
                    }
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </div>
                <div className="col-span-4 flex items-center space-x-2">
                  {getFileIcon(item)}
                  <div className="flex items-center group">
                    <button
                      onClick={() => {
                        if (item.type === "folder") {
                          navigateToFolder(item.id, item.name);
                        } else {
                          handleFilePreview(item);
                        }
                      }}
                      className="text-left hover:underline cursor-pointer"
                    >
                      {item.name}
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => handleRename(item.id, item.name)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="col-span-2 flex items-center text-sm text-muted-foreground">
                  {item.type === "folder" ? "Folder" : item.fileType || "File"}
                </div>
                <div className="col-span-2 flex items-center text-sm text-muted-foreground">
                  {formatDate(item.updatedAt)}
                </div>
                <div className="col-span-2 flex items-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center cursor-help">
                          {getStatusIcon(item.status, item.type)}
                          <span className="ml-2 text-sm text-muted-foreground">
                            {item.status}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{getStatusTooltip(item.status, item.type)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  confirmCreateFolder();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewFolderDialog(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button onClick={confirmCreateFolder} className="cursor-pointer">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-input">Name</Label>
              <Input
                id="rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleRenameSubmit();
                  }
                }}
                placeholder="Enter new name"
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

      {/* File Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader className="space-y-3">
            <DialogTitle>Preview: {previewFile?.name}</DialogTitle>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  previewFile &&
                  handleFileDownload(previewFile.id, previewFile.name)
                }
                className="cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {isLoadingPreview ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Loading preview...</div>
              </div>
            ) : previewContent ? (
              <div className="space-y-4">
                {previewContent.startsWith("blob:") ? (
                  // Image preview
                  <div className="flex justify-center">
                    <img
                      src={previewContent}
                      alt={previewFile?.name}
                      className="max-w-full max-h-96 object-contain rounded-md border"
                    />
                  </div>
                ) : (
                  // Text content preview
                  <div className="bg-muted/30 rounded-md p-4">
                    <pre className="whitespace-pre-wrap text-sm font-mono overflow-auto">
                      {previewContent}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">
                  No preview available
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
