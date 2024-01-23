import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({
    providedIn: 'root',
})
export class PdfService {
    generatePDF(
        htmlContent: HTMLElement,
        filename: string,
        scssStyle: string = `
            .p-card {
                box-shadow: 0 0 0 0 !important;
                border: none !important;
                font-size: 1.2rem;
            }

            .pdf-text {
                font-size: 1.4rem;
            }

            .pdf-label {
                font-size: 1.3rem;
                font-weight: bold;
            }

            .p-inputtext {
                border: none !important;
            }

            .p-fileupload-choose {
                display: none !important;
            }

            .p-hide {
                display: none !important;
            }
        `
    ) {
        // Agregar estilos dinámicos al HTML
        const style = document.createElement('style');
        style.innerHTML = scssStyle;
        htmlContent.appendChild(style);

        // Generar PDF a partir del contenido HTML
        html2canvas(htmlContent).then((canvas) => {
            const fileWidth = 208;
            const fileHeight = (canvas.height * fileWidth) / canvas.width;
            const FILEURI = canvas.toDataURL('image/png', 1.0);

            const PDF = new jsPDF('p', 'mm', 'a4');
            const position = 20;

            // Agregar la imagen al PDF
            PDF.addImage(FILEURI, 'PNG', 0, position, fileWidth, fileHeight);

            // Guardar el archivo PDF con el nombre especificado
            PDF.save(filename);

            // Eliminar los estilos agregados después de la generación del PDF
            htmlContent.removeChild(style);
        });
    }
}
