import {
  Tabs as TabsWrapper,
  TabsList,
  TabsContent,
  TabsTrigger,
} from "@/components/ui/tabs";
import UploadTab from "@/components/UploadTab";
import ViewTab from "@/components/ViewTab";

export function Tabs() {
  return (
    <TabsWrapper defaultValue="upload" className="w-[800px] items-center my-10">
      <TabsList className="mb-8">
        <TabsTrigger className="cursor-pointer" value="upload">
          Upload
        </TabsTrigger>
        <TabsTrigger className="cursor-pointer" value="view">
          View
        </TabsTrigger>
      </TabsList>
      <TabsContent value="upload">
        <UploadTab />
      </TabsContent>
      <TabsContent value="view" className="w-full">
        <ViewTab />
      </TabsContent>
    </TabsWrapper>
  );
}
