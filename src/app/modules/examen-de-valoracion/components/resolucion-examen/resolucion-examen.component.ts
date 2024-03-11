import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';
import { Experto } from '../../models/experto';
import { Docente } from 'src/app/modules/gestion-docentes/models/docente';
import { Estudiante } from 'src/app/modules/gestion-estudiantes/models/estudiante';
import { Subject } from 'rxjs';
import { SolicitudService } from '../../services/solicitud.service';
import { mapResponseException } from 'src/app/core/utils/exception-util';
import { errorMessage } from 'src/app/core/utils/message-util';

@Component({
    selector: 'app-resolucion-examen',
    templateUrl: './resolucion-examen.component.html',
})
export class ResolucionExamenComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();
    private unsubscribe_respuesta$ = new Subject<void>();
    private unsubscribe_evaluacion$ = new Subject<void>();

    isLoading: boolean = false;
    editMode: boolean = false;

    solicitudId: number;
    respuestaId: number;
    resolucionId: number;

    resolucionForm: FormGroup;

    tituloSeleccionado: string;
    estudianteSeleccionado: Estudiante = {};
    expertoSeleccionado: Experto;
    docenteSeleccionado: Docente;

    constructor(
        private router: Router,
        private solicitudService: SolicitudService,
        private fb: FormBuilder,
        private breadcrumbService: BreadcrumbService,
        private messageService: MessageService
    ) {}

    get docente(): FormControl {
        return this.resolucionForm.get('docente') as FormControl;
    }

    get experto(): FormControl {
        return this.resolucionForm.get('experto') as FormControl;
    }

    ngOnInit() {
        this.initForm();
        this.subscribeToObservers();
        // if (this.router.url.includes('editar')) {
        //     this.loadEditMode();
        // }
        this.loadData();
        this.setBreadcrumb();
    }

    initForm(): void {
        this.resolucionForm = this.fb.group({
            titulo: [null, Validators.required],

            fecha_correcciones: [null, Validators.required],
        });

        this.formReady.emit(this.resolucionForm);
    }

    subscribeToObservers() {
        this.solicitudService.estudianteSeleccionado$.subscribe({
            next: (response) => {
                if (response) {
                    this.estudianteSeleccionado = response;
                } else {
                    this.router.navigate(['examen-de-valoracion']);
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.tituloSeleccionadoSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.tituloSeleccionado = response;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.respuestaSeleccionadaSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.respuestaId = response.id;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.solicitudSeleccionadaSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.solicitudId = response.solicitudId;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
    }

    loadData() {
        this.resolucionId = 1;
        this.router.navigate([
            `examen-de-valoracion/resolucion/editar/${this.resolucionId}`,
        ]);
    }

    redirectToRespuesta(respuestaId: number) {
        this.router.navigate([
            `examen-de-valoracion/respuesta/editar/${respuestaId}`,
        ]);
    }

    redirectToSolicitud(solicitudId: number) {
        this.router.navigate([
            `examen-de-valoracion/solicitud/editar/${solicitudId}`,
        ]);
    }

    redirectToResolucion(resolucionId: number) {
        this.router.navigate([
            `examen-de-valoracion/resolucion/editar/${resolucionId}`,
        ]);
    }

    redirectToBandeja() {
        this.router.navigate(['examen-de-valoracion']);
    }

    handlerResponseException(response: any) {
        if (response.status != 501) return;
        const mapException = mapResponseException(response.error);
        mapException.forEach((value, _) => {
            this.messageService.add(errorMessage(value));
        });
    }

    isActiveIndex(): Boolean {
        if (this.router.url.includes('editar')) {
            return true;
        }
        return false;
    }

    setBreadcrumb() {
        this.breadcrumbService.setItems([
            { label: 'Trabajos de Grado' },
            {
                label: 'Examen de Valoracion',
                routerLink: 'examen-de-valoracion',
            },
            { label: 'Resolucion' },
        ]);
    }
}
