import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { Mensaje } from 'src/app/core/enums/enums';
import {
    errorMessage,
    infoMessage,
    warnMessage,
} from 'src/app/core/utils/message-util';
import { mapResponseException } from 'src/app/core/utils/exception-util';
import { Curso } from '../../models/curso';
import { CursoService } from '../../services/cursos.service';
import { SolicitudService } from 'src/app/modules/examen-de-valoracion/services/solicitud.service';
import { Router } from '@angular/router';
import { Estudiante } from 'src/app/modules/gestion-estudiantes/models/estudiante';

@Component({
    selector: 'curso-egresados',
    templateUrl: 'curso-egresados.component.html',
    styleUrls: ['curso-egresados.component.scss'],
})
export class CursoEgresadoComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();
    cursoForm: FormGroup;

    cursoId: number;
    estudianteId: number;

    editMode: boolean;
    loading: boolean = false;

    constructor(
        private fb: FormBuilder,
        private ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private messageService: MessageService,
        private cursoService: CursoService
    ) {}

    ngOnInit() {
        this.initForm();
        if (this.config.data?.estudianteId) {
            this.extractEstudianteIdFromData();
        }
        if (this.config.data?.cursoId) {
            this.extractCursoIdFromData();
        }
    }

    extractEstudianteIdFromData(): void {
        this.estudianteId = Number(this.config.data.estudianteId);
        this.cursoForm.get('idEstudiante').setValue(this.estudianteId);
    }

    extractCursoIdFromData(): void {
        this.editMode = true;
        this.cursoId = Number(this.config.data.cursoId);
        this.loadDataForEdit(this.cursoId);
    }

    initForm(): void {
        this.cursoForm = this.fb.group({
            idEstudiante: [null, Validators.required],
            nombre: [null, Validators.required],
            orientadoA: [null, Validators.required],
            fechaInicio: [null, Validators.required],
            fechaFin: [null, Validators.required],
        });

        this.formReady.emit(this.cursoForm);
    }

    setValuesForm(curso: Curso) {
        this.cursoForm.patchValue({
            ...curso,
        });
    }

    getFormControl(formControlName: string): FormControl {
        return this.cursoForm.get(formControlName) as FormControl;
    }

    addCurso() {
        this.loading = true;
        this.cursoService
            .addCurso(this.cursoForm.value)
            .subscribe({
                next: () => this.handleSuccessMessage(Mensaje.GUARDADO_EXITOSO),
                error: (e) => this.handleErrorResponse(e),
                complete: () => this.closeDialog(),
            })
            .add(() => (this.loading = false));
    }

    loadDataForEdit(id: number) {
        this.cursoService.getCurso(id).subscribe({
            next: (response) => {
                this.setValuesForm(response);
                this.extractEstudianteIdFromData();
                this.cursoForm
                    .get('fechaInicio')
                    .setValue(
                        response.fechaInicio
                            ? new Date(response.fechaInicio)
                            : null
                    );
                this.cursoForm
                    .get('fechaFin')
                    .setValue(
                        response.fechaFin ? new Date(response.fechaFin) : null
                    );
            },
            error: (e) => this.handleErrorResponse(e),
        });
    }

    updateCurso() {
        this.loading = true;
        this.cursoService
            .updateCurso(this.cursoId, this.cursoForm.value)
            .subscribe({
                next: () =>
                    this.handleSuccessMessage(Mensaje.ACTUALIZACION_EXITOSA),
                error: (e) => this.handleErrorResponse(e),
                complete: () => this.closeDialog(),
            })
            .add(() => (this.loading = false));
    }

    onSave() {
        if (this.cursoForm.invalid) {
            this.handleWarningMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS);
            return;
        }
        this.editMode ? this.updateCurso() : this.addCurso();
    }

    handlerResponseException(response: any) {
        if (response.status !== 501) return;

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

    private handleErrorResponse(error: any) {
        this.handlerResponseException(error);
        this.loading = false;
    }

    private closeDialog() {
        this.ref.close();
    }
}
