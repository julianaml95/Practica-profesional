import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';
import { Mensaje } from 'src/app/core/enums/enums';
import { mapResponseException } from 'src/app/core/utils/exception-util';
import {
    errorMessage,
    infoMessage,
    warnMessage,
} from 'src/app/core/utils/message-util';
import { Docente } from 'src/app/modules/gestion-docentes/models/docente';
import { BuscadorDocentesComponent } from 'src/app/shared/components/buscador-docentes/buscador-docentes.component';
import { BuscadorExpertosComponent } from 'src/app/shared/components/buscador-expertos/buscador-expertos.component';
import { Experto } from '../../models/experto';
import { SolicitudService } from '../../services/solicitud.service';

@Component({
    selector: 'app-solicitud-examen',
    templateUrl: './solicitud-examen.component.html',
    styleUrls: ['./solicitud-examen.component.scss'],
})
export class SolicitudExamenComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();

    loading: boolean;
    items: any;
    activeIndex: number = 0;
    solicitudForm: FormGroup;
    selectedFileFirst: File | null;
    selectedFileSecond: File | null;
    selectedFileThird: File | null;
    selectedFileFourth: File | null;

    constructor(
        private breadcrumbService: BreadcrumbService,
        private messageService: MessageService,
        private dialogService: DialogService,
        private solicitudService: SolicitudService,
        private fb: FormBuilder,
        private router: Router
    ) {}

    get docente(): FormControl {
        return this.solicitudForm.get('docente') as FormControl;
    }

    get experto(): FormControl {
        return this.solicitudForm.get('experto') as FormControl;
    }

    ngOnInit() {
        this.initForm();
        this.items = [
            {
                label: 'Solicitud Examen de Validacion',
                command: (event: any) =>
                    this.messageService.add({
                        severity: 'info',
                        summary: 'Primer Paso',
                        detail: event.item.label,
                    }),
            },
            {
                label: 'Respuesta Examen de Validacion',
                command: (event: any) =>
                    this.messageService.add({
                        severity: 'info',
                        summary: 'Segundo Paso',
                        detail: event.item.label,
                    }),
            },
            {
                label: 'Generacion de Resolucion',
                command: (event: any) =>
                    this.messageService.add({
                        severity: 'info',
                        summary: 'Tercer Paso',
                        detail: event.item.label,
                    }),
            },
            {
                label: 'Sustentacion Proyecto de Investigacion',
                command: (event: any) =>
                    this.messageService.add({
                        severity: 'info',
                        summary: 'Cuarto Paso',
                        detail: event.item.label,
                    }),
            },
        ];
        this.setBreadcrumb();
    }

    onActiveIndexChange(event: number) {
        this.activeIndex = event;
    }

    setBreadcrumb() {
        this.breadcrumbService.setItems([
            { label: 'Trabajos de Grado' },
            {
                label: 'Examen de Valoracion',
                routerLink: 'examen-de-valoracion',
            },
            { label: 'Proceso', routerLink: 'examen-de-valoracion/proceso' },
            { label: 'Solicitud' },
        ]);
    }

    onFileSelectFirst(event: any) {
        const selectedFiles: FileList = event.files;

        if (selectedFiles && selectedFiles.length > 0) {
            this.solicitudForm
                .get('doc_solicitud_valoracion')
                .setValue(selectedFiles[0]);
            this.selectedFileFirst = this.solicitudForm.get(
                'doc_solicitud_valoracion'
            ).value;
        }
    }

    onFileSelectSecond(event: any) {
        const selectedFiles: FileList = event.files;

        if (selectedFiles && selectedFiles.length > 0) {
            this.solicitudForm
                .get('doc_anteproyecto_examen')
                .setValue(selectedFiles[0]);
            this.selectedFileSecond = this.solicitudForm.get(
                'doc_anteproyecto_examen'
            ).value;
        }
    }

    onFileSelectThird(event: any) {
        const selectedFiles: FileList = event.files;

        if (selectedFiles && selectedFiles.length > 0) {
            this.solicitudForm
                .get('doc_examen_valoracion')
                .setValue(selectedFiles[0]);
            this.selectedFileThird = this.solicitudForm.get(
                'doc_examen_valoracion'
            ).value;
        }
    }

    onFileSelectFourth(event: any) {
        const selectedFiles: FileList = event.files;

        if (selectedFiles && selectedFiles.length > 0) {
            this.solicitudForm
                .get('doc_oficio_jurados')
                .setValue(selectedFiles[0]);
            this.selectedFileFourth = this.solicitudForm.get(
                'doc_oficio_jurados'
            ).value;
        }
    }

    initForm(): void {
        this.solicitudForm = this.fb.group({
            titulo: [null, Validators.required],
            doc_solicitud_valoracion: [null, Validators.required],
            doc_anteproyecto_examen: [null, Validators.required],
            doc_examen_valoracion: [null],
            docente: [null, Validators.required],
            experto: [null, Validators.required],
            numero_acta: [null, Validators.required],
            fecha_acta: [null],
            doc_oficio_jurados: [null],
            fecha_maxima_evaluacion: [null],
        });

        this.formReady.emit(this.solicitudForm);
    }

    getFormControl(formControlName: string): FormControl {
        return this.solicitudForm.get(formControlName) as FormControl;
    }

    showBuscadorDocentes() {
        return this.dialogService.open(BuscadorDocentesComponent, {
            header: 'Seleccionar docente',
            width: '60%',
        });
    }

    showBuscadorExpertos() {
        return this.dialogService.open(BuscadorExpertosComponent, {
            header: 'Seleccionar experto',
            width: '60%',
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

    mapRequest(): any {
        const value = this.solicitudForm.getRawValue();
        console.log(value);
        return {
            titulo: value.titulo,
            doc_solicitud_valoracion: value.doc_solicitud_valoracion,
            doc_anteproyecto_examen: value.doc_anteproyecto_examen,
            doc_examen_valoracion: value.doc_examen_valoracion,
            docente: value.docente?.id,
            experto: value.experto?.id,
            numero_acta: value.numero_acta,
            fecha_acta: value.fecha_acta,
            doc_oficio_jurados: value.doc_oficio_jurados,
            fecha_maxima_evaluacion: value.fecha_maxima_evaluacion,
        };
    }

    createSolicitud() {
        const request = this.mapRequest();
        this.loading = true;
        this.solicitudService
            .createSolicitud(request)
            .subscribe({
                next: () =>
                    this.messageService.add(
                        infoMessage(Mensaje.GUARDADO_EXITOSO)
                    ),
                error: (e) => this.handlerResponseException(e),
                complete: () => this.redirectToProceso(),
            })
            .add(() => (this.loading = false));
    }

    onSave() {
        if (this.solicitudForm.invalid) {
            this.messageService.clear();
            this.messageService.add(
                warnMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS)
            );
            return;
        }
        this.createSolicitud();
    }

    limpiarExperto() {
        this.experto.setValue(null);
    }

    limpiarDocente() {
        this.docente.setValue(null);
    }

    redirectToProceso() {
        this.router.navigate(['examen-de-valoracion/proceso']);
    }

    handlerResponseException(response: any) {
        if (response.status != 501) return;
        const mapException = mapResponseException(response.error);
        mapException.forEach((value, _) => {
            this.messageService.add(errorMessage(value));
        });
    }

    mapDocenteLabel(docente: Docente) {
        const ultimaUniversidad =
            docente.titulos.length > 0
                ? docente.titulos[docente.titulos.length - 1].universidad
                : 'Sin título universitario';

        return {
            id: docente.persona.id,
            nombre: docente.persona.nombre,
            apellido: docente.persona.apellido,
            correo: docente.persona.correoElectronico,
            universidad: ultimaUniversidad,
        };
    }

    mapExpertoLabel(experto: Experto) {
        const ultimaUniversidad =
            experto.titulos.length > 0
                ? experto.titulos[experto.titulos.length - 1].universidad
                : 'Sin título universitario';

        return {
            id: experto.id,
            nombre: experto.persona.nombre,
            apellido: experto.persona.apellido,
            correo: experto.persona.correoElectronico,
            universidad: ultimaUniversidad,
        };
    }
}
