import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Metadata } from "../lib/types/types";
import { isMetadata } from "@/lib/safeguards";
import { handleMetadata } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { saveFiles } from "@/lib/utils";
import { requestBlock } from "@/lib/utils";
import { formatTimestamp } from "@/lib/utils";

type PreviewCardProps = {
  preview: Metadata;
  onCancel?: () => void;
  setPreview?: React.Dispatch<React.SetStateAction<Metadata | null>>;
  onSaveSuccess?: () => void;
};

const PreviewCard: React.FC<PreviewCardProps> = ({
  preview,
  onCancel,
  setPreview,
  onSaveSuccess
}) => {
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveAndUploadLoading, setSaveAndUploadLoading] = useState(false);

  const handleSave = async () => {
    if (preview) {
      setSaveLoading(true);
      try {
        await saveFiles(preview);
      } catch (error) {
        console.error("Error during saving files:", error);
      } finally {
        setSaveLoading(false);
        if (setPreview) {
          setPreview(null);
        }
        if (onSaveSuccess) {
          onSaveSuccess();
        }
      }
    }
  };

  const handleSaveAndUpload = async () => {
    if (preview) {
      setSaveAndUploadLoading(true);
      try {
        await saveFiles(preview);
        // handleMetadata(preview);
          // suggestBlock(preview)
          //if (isMetadata(preview)) {
              requestBlock(preview);
          //} else {
          //    console.log("Wrong format");
          //}
      } catch (error) {
        console.error("Error during save and upload:", error);
      } finally {
        setSaveAndUploadLoading(false);
        if (setPreview) {
          setPreview(null);
        }
        if (onSaveSuccess) {
          onSaveSuccess();
        }
      }
    }
  };

  const display = (value: string | null | undefined) =>
    value?.trim() ? value : "None";

  return (
    <Card className="w-full mt-10">
      <CardHeader className="w-full">
        <CardTitle className="text-2xl text-center">Preview</CardTitle>
        <CardDescription>
          <div style={{ wordBreak: "break-all" }}>
            <b>URL:</b> {display(preview.url)}
          </div>
          <div style={{ wordBreak: "break-all" }}>
            <b>Title:</b> {display(preview.title)}
          </div>
          <div>
            <b>Description:</b> {display(preview.description)}
          </div>
          <div>
            <b>Timestamp:</b> {formatTimestamp(preview.timestamp)}
          </div>
          <div>
            <b>Keywords:</b> {display(preview.keywords)}
          </div>
          {/* <div>
            <b>MHTML:</b> {preview.mhtml}
          </div> */}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full h-100 mb-2 overflow-hidden">
          <img
            className="w-full object-cover object-top"
            src={preview.screenshot}
            alt="Screenshot"
          />
        </div>
      </CardContent>
      <CardFooter className="w-full flex justify-between">
        <Button
          className="cursor-pointer"
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <div>
          <Button
            className="cursor-pointer mr-5"
            variant="outline"
            onClick={handleSave}
            disabled={saveLoading || saveAndUploadLoading}
          >
            {saveLoading ? <Loader2 className="animate-spin" /> : "Save"}
          </Button>
          <Button
            className="cursor-pointer"
            variant="default"
            onClick={handleSaveAndUpload}
            disabled={saveLoading || saveAndUploadLoading}
          >
            {saveAndUploadLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              "Save and Upload"
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default PreviewCard;
