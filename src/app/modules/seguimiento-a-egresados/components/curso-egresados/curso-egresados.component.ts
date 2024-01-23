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

@Component({
    selector: 'curso-egresados',
    templateUrl: 'curso-egresados.component.html',
    styleUrls: ['curso-egresados.component.scss'],
})
export class CursoEgresadoComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();
    cursoForm: FormGroup;
    cursoId: number;
    editMode: boolean;
    loading = false;

    constructor(
        private fb: FormBuilder,
        private ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private messageService: MessageService,
        private cursoService: CursoService
    ) {}

    ngOnInit() {
        this.initForm();
        if (this.config.data?.id) {
            this.extractCursoIdFromData();
        }
    }

    extractCursoIdFromData(): void {
        this.editMode = true;
        this.cursoId = Number(this.config.data.id);
        this.loadDataForEdit(this.cursoId);
    }

    initForm(): void {
        this.cursoForm = this.fb.group({
            nombre: [null, Validators.required],
            orientadoA: [null, Validators.required],
            fechaInicio: [null, Validators.required],
            fechaFin: [null, Validators.required],
        });

        this.formReady.emit(this.cursoForm);
    }

    getFormControl(formControlName: string): FormControl {
        return this.cursoForm.get(formControlName) as FormControl;
    }

    handlerResponseException(response: any) {
        if (response.status !== 501) return;

        const mapException = mapResponseException(response.error);
        mapException.forEach((value) => {
            this.messageService.add(errorMessage(value));
        });
    }

    onCancel() {
        this.ref.close();
    }

    mapRequest(): any {
        const value = this.cursoForm.getRawValue();
        return {
            nombre: value.nombre,
            orientadoA: value.orientadoA,
            fechaInicio: value.fechaInicio,
            fechaFin: value.fechaFin,
        };
    }

    addCurso() {
        const request = this.mapRequest();
        this.loading = true;

        this.cursoService
            .addCurso(request)
            .subscribe({
                next: () => this.handleSuccessMessage(Mensaje.GUARDADO_EXITOSO),
                error: (e) => this.handleErrorResponse(e),
                complete: () => this.closeDialog(),
            })
            .add(() => (this.loading = false));
    }

    loadDataForEdit(id: number) {
        this.cursoService.getCurso(id).subscribe({
            next: (response) => this.setValuesForm(response),
            error: (e) => this.handleErrorResponse(e),
        });
    }

    setValuesForm(curso: Curso) {
        this.cursoForm.patchValue({
            ...curso,
        });
    }

    updateCurso() {
        const request = this.mapRequest();
        this.loading = true;
        this.cursoService
            .updateCurso(this.cursoId, request)
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
