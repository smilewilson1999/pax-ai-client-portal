import React, { useState } from "react";
import { Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useClaims, useClaimTemplates } from "../hooks/use-api";
import { CreateClaimRequest } from "../types";

interface CreateClaimDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function CreateClaimDialog({
  open: controlledOpen,
  onOpenChange,
}: CreateClaimDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [claimName, setClaimName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createClaim } = useClaims();
  const { templates, isLoading: templatesLoading } = useClaimTemplates();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!claimName.trim() || !selectedTemplateId) {
      return;
    }

    setIsSubmitting(true);

    try {
      const claimData: CreateClaimRequest = {
        name: claimName.trim(),
        template_id: selectedTemplateId,
        status: "InProgress",
      };

      await createClaim(claimData);

      // Reset form and close dialog
      setClaimName("");
      setSelectedTemplateId("");
      setOpen(false);
    } catch (error) {
      console.error("Error creating claim:", error);
      // TODO: Add toast notification for error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setClaimName("");
    setSelectedTemplateId("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Claim</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Claim Name Input */}
            <div className="space-y-2">
              <Label htmlFor="claimName">Claim Name</Label>
              <Input
                id="claimName"
                placeholder="Enter claim name (e.g., Q1 2024 Manufacturing Exports)"
                value={claimName}
                onChange={(e) => setClaimName(e.target.value)}
                required
              />
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <Label htmlFor="template">Claim Template</Label>
              {templatesLoading ? (
                <div className="text-sm text-muted-foreground">
                  Loading templates...
                </div>
              ) : (
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                >
                  <SelectTrigger className="w-full cursor-pointer">
                    <SelectValue placeholder="Select a claim template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Claim Templates</SelectLabel>
                      {templates?.map((template) => (
                        <SelectItem
                          key={template.id}
                          value={template.id}
                          className="py-3 px-4 cursor-pointer"
                        >
                          <div className="flex flex-col gap-1 w-full">
                            <span className="font-medium text-sm">
                              {template.name}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Template Details */}
            {selectedTemplateId && templates && (
              <div className="rounded-md bg-muted/50 p-4">
                {(() => {
                  const selectedTemplate = templates.find(
                    (t) => t.id === selectedTemplateId
                  );
                  return selectedTemplate ? (
                    <div>
                      <h4 className="font-medium mb-2">Required Documents:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {selectedTemplate.requiredDocuments.map(
                          (doc, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                              {doc}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !claimName.trim() || !selectedTemplateId || isSubmitting
              }
            >
              {isSubmitting ? "Creating..." : "Create Claim"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
