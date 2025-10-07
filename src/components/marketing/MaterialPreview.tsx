import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Share2, Download } from "lucide-react";
import { toast } from "sonner";

interface MaterialPreviewProps {
  content: string;
  username: string;
}

export const MaterialPreview = ({ content, username }: MaterialPreviewProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success('Conteúdo copiado!');
  };

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(content)}`;
    window.open(url, '_blank');
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `material-divulgacao-${username}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Material baixado!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Preview do Material</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <pre className="whitespace-pre-wrap text-sm font-sans">{content}</pre>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2" />
            Copiar
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareWhatsApp}>
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar no WhatsApp
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Baixar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};