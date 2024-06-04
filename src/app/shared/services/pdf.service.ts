import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

@Injectable({
    providedIn: 'root',
})
export class PdfService {
    constructor() {
        pdfMake.vfs = pdfFonts.pdfMake.vfs;
    }

    getStyles() {
        return {
            flexContainer: {
                columnGap: 10,
                margin: [0, 5, 0, 5],
            },
            titleLeft: {
                alignment: 'left',
                bold: true,
                fontSize: 18,
                width: '60%',
            },
            imageRight: {
                alignment: 'center',
                width: '40%',
            },
            labelStyle: {
                alignment: 'left',
                bold: true,
                fontFeatures: ['c2sc', 'smcp'],
                margin: [0, 5, 0, 5],
            },
            contentStyle: {
                alignment: 'left',
                margin: [0, 5, 0, 5],
            },
            leftAlignment: {
                alignment: 'left',
                margin: [0, 10, 0, 10],
            },
            rightAlignment: {
                alignment: 'right',
                margin: [0, 10, 0, 10],
            },
            centerAlignment: {
                alignment: 'center',
                margin: [0, 10, 0, 10],
            },
        };
    }

    async generatePDF(htmlContent: any, filename: string) {
        const content = await this.extractContentFromElement(htmlContent);
        const footerContent = await this.extractFooterFromElement(htmlContent);
        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [30, 40, 30, 40],
            content: content,
            footer: () => {
                return {
                    columns: footerContent,
                    style: 'flexContainer',
                    margin: [30, -60, 30, 0],
                };
            },
            styles: this.getStyles(),
            defaultStyle: {
                font: 'Roboto',
            },
        };

        pdfMake.createPdf(docDefinition).download(filename);
    }

    async extractFooterFromElement(element) {
        const content = [];
        await this.extractFooterContent(element, content);
        return content;
    }

    async extractContentFromElement(element) {
        const content = [];
        await this.extractNodeContent(element, content);
        return content;
    }

    async extractFooterContent(node, content) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            if (
                node.classList.contains('body-footer') ||
                node.classList.contains('footer-text')
            ) {
                const bodyFooterContent = [];
                for (let child of node.childNodes) {
                    if (
                        child.nodeType === Node.ELEMENT_NODE &&
                        child.tagName === 'IMG'
                    ) {
                        const imgData = await this.convertImageToDataURL(
                            child.src
                        );
                        bodyFooterContent.push({
                            image: imgData,
                            width: 100,
                            style: 'titleLeft',
                        });
                    } else if (
                        child.nodeType === Node.ELEMENT_NODE &&
                        child.tagName === 'DIV'
                    ) {
                        const divContent = [];
                        for (let divChild of child.childNodes) {
                            if (
                                divChild.nodeType === Node.ELEMENT_NODE &&
                                divChild.tagName === 'SPAN'
                            ) {
                                divContent.push({
                                    text: ' ' + divChild.textContent.trim(),
                                    style: 'imageRight',
                                });
                            } else if (
                                divChild.nodeType === Node.ELEMENT_NODE &&
                                divChild.tagName === 'HR'
                            ) {
                                divContent.push({
                                    canvas: [
                                        {
                                            type: 'line',
                                            x1: 0,
                                            y1: 0,
                                            x2: 350,
                                            y2: 0,
                                            lineWidth: 1,
                                            color: '#ff0000',
                                        },
                                    ],
                                    alignment: 'center',
                                    margin: [0, 5, 0, 5],
                                });
                            }
                        }
                        bodyFooterContent.push({
                            stack: divContent,
                        });
                    }
                }
                content.push({
                    columns: bodyFooterContent,
                });
            } else {
                for (let child of node.childNodes) {
                    await this.extractFooterContent(child, content);
                }
            }
        }
    }

    async extractNodeContent(node, content) {
        if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.classList.contains('p-hide')
        ) {
            return;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'P') {
                content.push({
                    text: node.innerText.trim(),
                    margin: [0, 10, 0, 10],
                });
            }

            if (node.classList.contains('header-titulo')) {
                const tituloContent = [];

                for (let child of node.childNodes) {
                    if (
                        child.nodeType === Node.ELEMENT_NODE &&
                        child.tagName === 'SPAN'
                    ) {
                        tituloContent.push({
                            text: child.textContent.trim(),
                            style: 'centerAlignment',
                        });
                    }
                }

                content.push(...tituloContent);
            }

            if (node.classList.contains('body-field')) {
                const bodyFieldContent = [];
                for (let child of node.childNodes) {
                    if (
                        child.nodeType === Node.ELEMENT_NODE &&
                        child.tagName === 'LABEL'
                    ) {
                        bodyFieldContent.push({
                            text: child.innerText.trim(),
                            style: 'labelStyle',
                            width: '20%',
                        });
                    } else if (
                        child.nodeType === Node.ELEMENT_NODE &&
                        child.tagName === 'SPAN'
                    ) {
                        bodyFieldContent.push({
                            text: child.innerText.trim(),
                            style: 'contentStyle',
                            width: '80%',
                        });
                    }
                }
                content.push({
                    columns: bodyFieldContent,
                    style: 'flexContainer',
                });
            }

            if (
                node.classList.contains('body-image--left') ||
                node.classList.contains('body-image')
            ) {
                const bodyImageContent = [];

                for (let child of node.childNodes) {
                    if (
                        child.nodeType === Node.ELEMENT_NODE &&
                        child.tagName === 'B'
                    ) {
                        bodyImageContent.push({
                            text: ' ' + child.textContent.trim(),
                            style: 'rightAlignment',
                        });
                    } else if (
                        child.nodeType === Node.ELEMENT_NODE &&
                        child.tagName === 'IMG'
                    ) {
                        const imgData = await this.convertImageToDataURL(
                            child.src
                        );
                        bodyImageContent.push({
                            image: imgData,
                            width: 100,
                            style: node.classList.contains('body-image--left')
                                ? 'leftAlignment'
                                : 'rightAlignment',
                        });
                    }
                }

                content.push(...bodyImageContent);
            }

            if (node.classList.contains('header-logo')) {
                const headerContent = [];

                for (let child of node.childNodes) {
                    if (
                        child.nodeType === Node.ELEMENT_NODE &&
                        child.tagName === 'H2'
                    ) {
                        headerContent.push({
                            text: ' ' + child.textContent.trim(),
                            style: 'titleLeft',
                        });
                    } else if (
                        child.nodeType === Node.ELEMENT_NODE &&
                        child.tagName === 'IMG'
                    ) {
                        const imgData = await this.convertImageToDataURL(
                            child.src
                        );
                        headerContent.push({
                            image: imgData,
                            width: 80,
                            style: 'imageRight',
                        });
                    }
                }

                content.push({
                    columns: headerContent,
                    style: 'flexContainer',
                });
            } else {
                for (let child of node.childNodes) {
                    await this.extractNodeContent(child, content);
                }
            }
        }
    }

    convertImageToDataURL(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = (err) => reject(err);
            img.src = url;
        });
    }
}
