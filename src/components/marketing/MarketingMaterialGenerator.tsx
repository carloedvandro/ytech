import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { MaterialPreview } from "./MaterialPreview";

interface MarketingMaterialGeneratorProps {
  username: string;
  fullName: string;
}

export const MarketingMaterialGenerator = ({ username, fullName }: MarketingMaterialGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [materialType, setMaterialType] = useState<string>('whatsapp');
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [remainingGenerations, setRemainingGenerations] = useState<number>(5);

  const checkRemainingGenerations = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('marketing_material_generations')
        .select('id', { count: 'exact' })
        .gte('created_at', today.toISOString());

      if (error) throw error;
      
      const used = data?.length || 0;
      setRemainingGenerations(Math.max(0, 5 - used));
      
      return 5 - used;
    } catch (error) {
      console.error('Error checking generations:', error);
      return 5;
    }
  };

  const handleGenerate = async () => {
    const remaining = await checkRemainingGenerations();
    
    if (remaining <= 0) {
      toast.error('Limite diário atingido', {
        description: 'Você já gerou 5 materiais hoje. Tente novamente amanhã.'
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');

    try {
      const { data, error } = await supabase.functions.invoke('generate-marketing-material', {
        body: {
          materialType,
          username,
          fullName
        }
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes('Limite diário')) {
          toast.error('Limite diário atingido', {
            description: data.error
          });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setGeneratedContent(data.content);
      await checkRemainingGenerations();
      
      toast.success('Material gerado com sucesso!', {
        description: `Você ainda pode gerar ${remaining - 1} materiais hoje.`
      });
    } catch (error) {
      console.error('Error generating material:', error);
      toast.error('Erro ao gerar material', {
        description: 'Tente novamente em alguns instantes.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full" 
          size="lg"
          onClick={() => {
            checkRemainingGenerations();
            setOpen(true);
          }}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Gerar Material de Divulgação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Material de Divulgação</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Gerações restantes hoje: <span className="font-bold text-primary">{remainingGenerations}/5</span>
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Material</label>
            <Select value={materialType} onValueChange={setMaterialType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">Post para WhatsApp</SelectItem>
                <SelectItem value="social">Post para Redes Sociais</SelectItem>
                <SelectItem value="presentation">Apresentação Completa</SelectItem>
                <SelectItem value="standard">Material Padrão (Sem IA)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleGenerate} 
            className="w-full" 
            disabled={isGenerating || remainingGenerations <= 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Material
              </>
            )}
          </Button>

          {generatedContent && (
            <MaterialPreview 
              content={generatedContent} 
              username={username}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};