import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
      ).toString();
      const arrayBuffer = await file.arrayBuffer();
      const bufferForText = arrayBuffer.slice(0);
      const bufferForImages = arrayBuffer.slice(0);
      const uint8Array = new Uint8Array(arrayBuffer);
      const pdf = await pdfjsLib.getDocument({ data: bufferForText }).promise;
      const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
      setTestName(file.name.replace('.pdf', ''));
      toast.info('Rendering pages for preview & cropping...');
      const pageImages = await renderPDFPagesToImages(bufferForImages, 1.5);
      const pageImages = await renderPDFPagesToImages(arrayBuffer, 1.5);
      setPdfPageImages(pageImages);
      toast.success(`PDF processed: ${pdf.numPages} pages`);
        };
      });
      // Deduct quota immediately after successful extraction
      try {
        await logTestCreation({ testId: 'extracted-draft', testName: data.examTitle || 'PDF Extraction', aiCalls: 1 });
      } catch (e) {
        console.error('Failed to log quota usage', e);
      }
      setExtractedQuestions(questions);
      setExtractionStats({
        totalExtracted: data.totalExtracted || questions.length,
        return;
      }
      await logTestCreation({ testId: test.id, testName: test.name, aiCalls: 1 });
      }
      toast.success(
        `Test saved! Remaining today: ${Math.max(0, quota.dailyRemaining - 1)}/${quota.dailyLimit}`
      );
      // Quota already logged during extraction
      toast.success('Test saved successfully!');
      navigate(`/tests`);
    } catch (e: any) {
      console.error(e);
                      </div>
                      {q.correctAnswer && <span className="text-xs text-muted-foreground italic">✓ Answer: {q.correctAnswer}</span>}
                    </div>
                    <div className="text-sm mb-2 line-clamp-3">
                      <LatexRenderer content={q.question} />
                    </div>
                      <div className="text-sm mb-2 line-clamp-3">
                        <LatexRenderer content={q.question} />
                      </div>
                      <div className="mt-2 mb-2">
                        {q.croppedImageUrl ? (
                          <img src={q.croppedImageUrl} className="max-h-32 object-contain rounded border border-border" />
                        ) : q.hasDiagram && q.pdfPageNumber && pdfPageImages.find(p => p.pageNumber === q.pdfPageNumber) ? (
                          <div className="p-2 rounded bg-muted/50 border border-border">
                            <p className="text-xs text-muted-foreground mb-1">Uncropped diagram from Page {q.pdfPageNumber}:</p>
                            <img src={pdfPageImages.find(p => p.pageNumber === q.pdfPageNumber)!.imageDataUrl} className="max-h-24 object-contain rounded opacity-80" />
                          </div>
                        ) : null}
                      </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                      {Object.entries(q.options).map(([key, value]) => (
                        <div key={key} className="p-1.5 rounded">
  );
}
