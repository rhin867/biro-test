import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { TestResult } from '@/types/exam';

export async function generateAnalysisPDF(result: TestResult) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;

  // Title Page
  doc.setFillColor(26, 31, 46); // Dark blue theme
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('AspirantAI', pageWidth / 2, 40, { align: 'center' });
  doc.setFontSize(32);
  doc.text('Advanced Performance Analysis', pageWidth / 2, 60, { align: 'center' });
  
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1);
  doc.line(margin * 2, 75, pageWidth - margin * 2, 75);
  
  doc.setFontSize(18);
  doc.text(`Test: ${result.testName}`, pageWidth / 2, 100, { align: 'center' });
  doc.text(`Date: ${new Date(result.completedAt).toLocaleDateString()}`, pageWidth / 2, 115, { align: 'center' });
  doc.text(`Attempt: #${result.attemptNumber || 1}`, pageWidth / 2, 130, { align: 'center' });
  
  doc.setFontSize(48);
  doc.setTextColor(59, 130, 246);
  doc.text(`${result.score} / ${result.maxScore}`, pageWidth / 2, 170, { align: 'center' });
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL SCORE', pageWidth / 2, 185, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('© 2026 AspirantAI - Performance Optimization Report', pageWidth / 2, pageHeight - 20, { align: 'center' });

  // List of IDs to capture
  const sections = [
    { id: 'overview', title: 'Executive Summary' },
    { id: 'score-potential', title: 'Score Potential Analysis' },
    { id: 'attempt-analysis', title: 'Attempt Quality Analysis' },
    { id: 'time-analysis', title: 'Time Distribution Analysis' },
    { id: 'difficulty', title: 'Difficulty Level Breakdown' },
    { id: 'subject-movement', title: 'Subject Strategy Analysis' },
    { id: 'fatigue', title: 'Focus & Fatigue Heatmap' },
    { id: 'ghost-replay', title: 'Step-by-Step Test Journey' },
    { id: 'question-journey', title: 'Visual Question Timeline' },
    { id: 'painful', title: 'Painful Questions & Bottlenecks' },
    { id: 'missed-concepts', title: 'Conceptual Gap Analysis' },
    { id: 'comparison', title: 'Benchmarking & Topper Comparison' },
    { id: 'complete-analysis', title: 'Complete Audit Table' },
    { id: 'chapters', title: 'Chapter-wise Mastery' },
    { id: 'mistakes', title: 'Mistake Taxonomy' },
    { id: 'learnings', title: 'Self-Reflection & Takeaways' },
  ];

  // We need to temporarily show all tabs or iterate through them
  // For now, let's capture what's visible or try to capture the main container
  
  for (const section of sections) {
    const el = document.getElementById(section.id);
    if (!el) continue;

    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.text(section.title, margin, 15);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 20, pageWidth - margin, 20);

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgProps = doc.getImageProperties(imgData);
      const imgHeight = (imgProps.height * contentWidth) / imgProps.width;
      
      // If height > pageHeight - 30, we might need multiple pages for one section
      let heightLeft = imgHeight;
      let position = 25;
      
      doc.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight);
      
      // If the content is too long, we'd need to slice the canvas, 
      // but for most tabs it should fit in one or two pages.
      // This is a simplified version that adds a page per tab.
    } catch (err) {
      console.error(`Failed to capture section ${section.id}:`, err);
    }
  }

  doc.save(`${result.testName}-Comprehensive-Analysis.pdf`);
}
