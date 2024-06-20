import {
    Component,
    ElementRef,
    EventEmitter,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';

import { Mensaje } from 'src/app/core/enums/enums';
import { mapResponseException } from 'src/app/core/utils/exception-util';
import {
    errorMessage,
    infoMessage,
    warnMessage,
} from 'src/app/core/utils/message-util';
import { Estudiante } from 'src/app/modules/gestion-estudiantes/models/estudiante';
import { SolicitudService } from '../../services/solicitud.service';
import { BuscadorExpertosComponent } from 'src/app/shared/components/buscador-expertos/buscador-expertos.component';
import { BuscadorDocentesComponent } from 'src/app/shared/components/buscador-docentes/buscador-docentes.component';
import { PdfService } from 'src/app/shared/services/pdf.service';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';

@Component({
    selector: 'documento-formatoB',
    templateUrl: 'documento-formatoB.component.html',
    styleUrls: ['documento-formatoB.component.scss'],
})
export class DocumentoFormatoBComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();
    @Output() formatoBPdfGenerated = new EventEmitter<File>();

    @ViewChild('formatoB') formatoB!: ElementRef;

    formatoBForm: FormGroup;
    fechaActual: Date;

    loading = false;

    estudianteSeleccionado: Estudiante = {};
    estados: string[] = ['Aprobado', 'Aplazado', 'No Aprobado'];

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private dialogService: DialogService,
        private messageService: MessageService,
        private breadcrumbService: BreadcrumbService,
        private solicitudService: SolicitudService,
        private pdfService: PdfService
    ) {}

    get estudiante(): FormControl {
        return this.formatoBForm.get('estudiante') as FormControl;
    }

    get experto(): FormControl {
        return this.formatoBForm.get('jurado_externo') as FormControl;
    }

    get docente(): FormControl {
        return this.formatoBForm.get('jurado_interno') as FormControl;
    }

    ngOnInit() {
        this.initForm();
        this.fechaActual = new Date();

        this.solicitudService.tituloSeleccionadoSubject$.subscribe(
            (response) => {
                if (response) {
                    this.formatoBForm.get('titulo').setValue(response);
                }
            }
        );

        this.solicitudService.estudianteSeleccionado$.subscribe((response) => {
            this.estudianteSeleccionado = response;
            if (response) {
                this.estudiante.setValue(
                    this.nombreCompletoEstudiante(response)
                );
            }
        });

        if (!this.estudianteSeleccionado) {
            this.router.navigate(['examen-de-valoracion/respuesta']);
        }

        // this.setBreadcrumb();
    }

    initForm(): void {
        this.formatoBForm = this.fb.group({
            titulo: [null, Validators.required],
            estudiante: [null, Validators.required],
            jurado_interno: [null, Validators.required],
            jurado_externo: [null, Validators.required],
            conceptoJurado: [null, Validators.required],
            fecha: [null, Validators.required],
        });

        this.formatoBForm.get('titulo').disable();
        this.formatoBForm.get('estudiante').disable();
        this.formReady.emit(this.formatoBForm);
    }

    getFormattedDate(): string {
        const rawDate = new Date(this.formatoBForm.get('fecha').value);
        const day = rawDate.getDate();
        const month = rawDate.toLocaleString('default', { month: 'short' });
        const year = rawDate.getFullYear();
        return `${day} ${month} ${year}`;
    }

    onCancel() {
        this.router.navigate(['examen-de-valoracion/solicitud']);
    }

    onDownload() {
        if (this.formatoBForm.invalid) {
            this.handleWarningMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS);
            return;
        } else {
            const data = document.getElementById('formatoB');
            this.pdfService.generatePDF(data).then((pdfBlob: Blob) => {
                const file = new File(
                    [pdfBlob],
                    `${this.estudianteSeleccionado.codigo} - formatoB.pdf`,
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
        if (this.formatoBForm.invalid) {
            this.handleWarningMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS);
            return;
        } else {
            const data = document.getElementById('formatoB');
            this.pdfService.generatePDF(data).then((pdfBlob: Blob) => {
                const file = new File(
                    [pdfBlob],
                    `${this.estudianteSeleccionado.codigo} - formatoB.pdf`,
                    {
                        type: 'application/pdf',
                    }
                );
                this.formatoBPdfGenerated.emit(file);
                this.handleSuccessMessage(Mensaje.GUARDADO_EXITOSO);
            });
        }
    }

    getFormControl(formControlName: string): FormControl {
        return this.formatoBForm.get(formControlName) as FormControl;
    }

    showBuscadorExpertos() {
        return this.dialogService.open(BuscadorExpertosComponent, {
            header: 'Seleccionar experto',
            width: '40%',
        });
    }

    mapExpertoLabel(experto: any) {
        return {
            id: experto.id,
            nombre: experto.nombre,
            apellido: experto.apellido,
            correo: experto.correoElectronico ?? experto.correo,
            universidad: experto.universidad,
        };
    }

    showBuscadorDocentes() {
        return this.dialogService.open(BuscadorDocentesComponent, {
            header: 'Seleccionar docente',
            width: '40%',
        });
    }
    nombreCompletoEstudiante(e: any) {
        return `${e.nombre} ${e.apellido}`;
    }

    mapDocenteLabel(docente: any) {
        const ultimaUniversidad =
            docente?.titulos?.length > 0
                ? docente.titulos[docente.titulos.length - 1].universidad
                : null;

        return {
            id: docente.id,
            nombre: docente.nombre,
            apellido: docente.apellido,
            correo: docente.correoElectronico ?? docente.correo,
            universidad: docente.universidad ?? ultimaUniversidad,
        };
    }

    onSeleccionarExperto() {
        const ref = this.showBuscadorExpertos();
        ref.onClose.subscribe({
            next: (response) => {
                if (response) {
                    const experto = this.mapExpertoLabel(response);
                    this.experto.setValue(experto);
                }
            },
        });
    }

    onSeleccionarDocente() {
        const ref = this.showBuscadorDocentes();
        ref.onClose.subscribe({
            next: (response) => {
                if (response) {
                    const docente = this.mapDocenteLabel(response);
                    this.docente.setValue(docente);
                }
            },
        });
    }

    handlerResponseException(response: any) {
        if (response.status !== 501) return;

        const mapException = mapResponseException(response.error);
        mapException.forEach((value) => {
            this.messageService.add(errorMessage(value));
        });
    }

    // setBreadcrumb() {
    //     this.breadcrumbService.setItems([
    //         { label: 'Trabajos de Grado' },
    //         {
    //             label: 'Examen de Valoracion',
    //             routerLink: 'examen-de-valoracion',
    //         },
    //         {
    //             label: 'Respuesta',
    //             routerLink: 'examen-de-valoracion/respuesta',
    //         },
    //     ]);
    // }

    private handleSuccessMessage(message: string) {
        this.messageService.add(infoMessage(message));
    }

    private handleWarningMessage(message: string) {
        this.messageService.clear();
        this.messageService.add(warnMessage(message));
    }

    limpiarDocente() {
        this.docente.setValue(null);
    }

    limpiarExperto() {
        this.experto.setValue(null);
    }
}
