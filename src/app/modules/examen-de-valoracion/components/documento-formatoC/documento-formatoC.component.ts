import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import {
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { MessageService } from 'primeng/api';

import { Estudiante } from 'src/app/modules/gestion-estudiantes/models/estudiante';
import { PdfService } from 'src/app/shared/services/pdf.service';
import { TrabajoDeGradoService } from '../../services/trabajoDeGrado.service';
import { Mensaje } from 'src/app/core/enums/enums';
import { mapResponseException } from 'src/app/core/utils/exception-util';
import {
    errorMessage,
    infoMessage,
    warnMessage,
} from 'src/app/core/utils/message-util';

@Component({
    selector: 'documento-formatoC',
    templateUrl: 'documento-formatoC.component.html',
    styleUrls: ['documento-formatoC.component.scss'],
})
export class DocumentoFormatoCComponent implements OnInit {
    @Input() evaluadorNombre: string;
    @Output() formReady = new EventEmitter<FormGroup>();
    @Output() formatoCPdfGenerated = new EventEmitter<File>();

    @ViewChild('formatoC') formatoC!: ElementRef;

    formatoCForm: FormGroup;

    loading = false;

    fechaActual: Date;
    estudianteSeleccionado: Estudiante = {};

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private trabajoDeGradoService: TrabajoDeGradoService,
        private pdfService: PdfService
    ) {}

    get titulo(): FormControl {
        return this.formatoCForm.get('titulo') as FormControl;
    }

    get observaciones(): FormArray {
        return this.formatoCForm.get('observaciones') as FormArray;
    }

    get recomendaciones(): FormArray {
        return this.formatoCForm.get('recomendaciones') as FormArray;
    }

    ngOnInit() {
        this.initForm();
        this.fechaActual = new Date();

        this.trabajoDeGradoService.tituloSeleccionadoSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.titulo.setValue(response);
                }
            },
            error: (e) => this.handlerResponseException(e),
        });

        this.trabajoDeGradoService.estudianteSeleccionado$.subscribe({
            next: (response) => {
                if (response) {
                    this.estudianteSeleccionado = response;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });

        this.formatoCForm.get('nombreJurado').setValue(this.evaluadorNombre);
    }

    initForm(): void {
        this.formatoCForm = this.fb.group({
            receptor: [null, Validators.required],
            asunto: [null, Validators.required],
            titulo: [null, Validators.required],
            observaciones: [null, Validators.required],
            nombreJurado: [null, Validators.required],
        });

        this.formatoCForm.get('titulo').disable();
        this.formatoCForm.get('nombreJurado').disable();
        this.formReady.emit(this.formatoCForm);
    }

    onDownload() {
        if (this.formatoCForm.invalid) {
            this.handleWarningMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS);
            return;
        } else {
            const data = document.getElementById('formatoC');
            this.pdfService.generatePDF(data).then((pdfBlob: Blob) => {
                const file = new File(
                    [pdfBlob],
                    `${this.estudianteSeleccionado.codigo} - formatoC.pdf`,
                    {
                        type: 'application/pdf',
                    }
                );
                const link = document.createElement('a');
                link.download = file.name;
                link.href = URL.createObjectURL(file);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                this.handleSuccessMessage(Mensaje.GUARDADO_EXITOSO);
            });
        }
    }

    onAdjuntar() {
        if (this.formatoCForm.invalid) {
            this.handleWarningMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS);
            return;
        } else {
            const data = document.getElementById('formatoC');
            this.pdfService.generatePDF(data).then((pdfBlob: Blob) => {
                const file = new File(
                    [pdfBlob],
                    `${this.estudianteSeleccionado.codigo} - formatoC.pdf`,
                    {
                        type: 'application/pdf',
                    }
                );
                this.formatoCPdfGenerated.emit(file);
                this.handleSuccessMessage(Mensaje.GUARDADO_EXITOSO);
            });
        }
    }

    handlerResponseException(response: any) {
        if (response.status !== 500) return;
        const mapException = mapResponseException(response.error);
        mapException.forEach((value) => {
            this.messageService.add(errorMessage(value));
        });
    }

    private handleSuccessMessage(message: string) {
        this.messageService.add(infoMessage(message));
    }

    private handleWarningMessage(message: string) {
        this.messageService.clear();
        this.messageService.add(warnMessage(message));
    }
}
