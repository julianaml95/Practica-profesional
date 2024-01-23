import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService, SelectItem } from 'primeng/api';
import { EmpresaService } from '../../services/empresas.service';
import { Mensaje } from 'src/app/core/enums/enums';
import {
    errorMessage,
    infoMessage,
    warnMessage,
} from 'src/app/core/utils/message-util';
import { mapResponseException } from 'src/app/core/utils/exception-util';
import { Empresa } from '../../models/empresa';
import { enumToSelectItems } from 'src/app/core/utils/util';
import { EstadoEmpresa } from 'src/app/core/enums/domain-enum';

@Component({
    selector: 'empresa-egresados',
    templateUrl: 'empresa-egresados.component.html',
    styleUrls: ['empresa-egresados.component.scss'],
})
export class EmpresaEgresadoComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();
    empresaForm: FormGroup;
    empresaId: number;
    editMode: boolean;
    loading = false;
    estados: SelectItem[] = enumToSelectItems(EstadoEmpresa);


    constructor(
        private fb: FormBuilder,
        private ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private messageService: MessageService,
        private empresaService: EmpresaService
    ) {}

    ngOnInit() {
        this.initForm();
        if (this.config.data?.id) {
            this.extractEmpresaIdFromData();
        }
    }

    extractEmpresaIdFromData(): void {
        this.editMode = true;
        this.empresaId = Number(this.config.data.id);
        this.loadDataForEdit(this.empresaId);
    }

    initForm(): void {
        this.empresaForm = this.fb.group({
            nombre: [null, Validators.required],
            ubicacion: [null, Validators.required],
            cargo: [null, Validators.required],
            jefeDirecto: [null, Validators.required],
            telefonoEmpresa: [null, Validators.required],
            correoEmpresa: [null, [Validators.required, Validators.email]],
            estado: [null, Validators.required],
        });

        this.formReady.emit(this.empresaForm);
    }

    getFormControl(formControlName: string): FormControl {
        return this.empresaForm.get(formControlName) as FormControl;
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
        const value = this.empresaForm.getRawValue();
        return {
            nombre: value.nombre,
            ubicacion: value.ubicacion,
            cargo: value.cargo,
            jefeDirecto: value.jefeDirecto,
            telefono: value.telefonoEmpresa,
            correo: value.correoEmpresa,
            estado: value.estado,
        };
    }

    addEmpresa() {
        const request = this.mapRequest();
        this.loading = true;

        this.empresaService
            .addEmpresa(request)
            .subscribe({
                next: () => this.handleSuccessMessage(Mensaje.GUARDADO_EXITOSO),
                error: (e) => this.handleErrorResponse(e),
                complete: () => this.closeDialog(),
            })
            .add(() => (this.loading = false));
    }

    loadDataForEdit(id: number) {
        this.empresaService.getEmpresa(id).subscribe({
            next: (response) => this.setValuesForm(response),
            error: (e) => this.handleErrorResponse(e),
        });
    }

    setValuesForm(empresa: Empresa) {
        this.empresaForm.patchValue({
            ...empresa,
        });
    }

    updateEmpresa() {
        const request = this.mapRequest();
        this.loading = true;
        this.empresaService
            .updateEmpresa(this.empresaId, request)
            .subscribe({
                next: () =>
                    this.handleSuccessMessage(Mensaje.ACTUALIZACION_EXITOSA),
                error: (e) => this.handleErrorResponse(e),
                complete: () => this.closeDialog(),
            })
            .add(() => (this.loading = false));
    }

    onSave() {
        if (this.empresaForm.invalid) {
            this.handleWarningMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS);
            return;
        }
        this.editMode ? this.updateEmpresa() : this.addEmpresa();
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
