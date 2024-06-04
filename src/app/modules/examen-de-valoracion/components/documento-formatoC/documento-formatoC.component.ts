import {
    Component,
    ElementRef,
    EventEmitter,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import {
    FormArray,
    FormBuilder,
    FormGroup,
    Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { Mensaje } from 'src/app/core/enums/enums';
import { mapResponseException } from 'src/app/core/utils/exception-util';
import {
    errorMessage,
    infoMessage,
    warnMessage,
} from 'src/app/core/utils/message-util';
import { Estudiante } from 'src/app/modules/gestion-estudiantes/models/estudiante';
import { SolicitudService } from '../../services/solicitud.service';
import { PdfService } from 'src/app/shared/services/pdf.service';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';

@Component({
    selector: 'documento-formatoC',
    templateUrl: 'documento-formatoC.component.html',
    styleUrls: ['documento-formatoC.component.scss'],
})
export class DocumentoFormatoCComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();
    @ViewChild('formatoC') formatoC!: ElementRef;
    formatoCForm: FormGroup;

    loading = false;
    fechaActual: Date;

    estudianteSeleccionado: Estudiante = {};
    firmaJuradoImage: string | ArrayBuffer;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private messageService: MessageService,
        private breadcrumbService: BreadcrumbService,
        private solicitudService: SolicitudService,
        private pdfService: PdfService
    ) {}

    get observaciones(): FormArray {
        return this.formatoCForm.get('observaciones') as FormArray;
    }

    get recomendaciones(): FormArray {
        return this.formatoCForm.get('recomendaciones') as FormArray;
    }

    ngOnInit() {
        this.initForm();
        this.fechaActual = new Date();

        this.solicitudService.tituloSeleccionadoSubject$.subscribe(
            (response) => {
                if (response) {
                    this.formatoCForm.get('titulo').setValue(response);
                }
            }
        );

        this.solicitudService.estudianteSeleccionado$.subscribe((response) => {
            this.estudianteSeleccionado = response;
        });

        if (!this.estudianteSeleccionado) {
            this.router.navigate(['examen-de-valoracion/respuesta']);
        }

        this.setBreadcrumb();
    }

    initForm(): void {
        this.formatoCForm = this.fb.group({
            asunto: [null, Validators.required],
            titulo: [null, Validators.required],
            observaciones: this.fb.array([]),
            recomendaciones: this.fb.array([]),
            firmaJurado: [null, Validators.required],
            nombreJurado: [null, Validators.required],
            afiliacionJurado: [null, Validators.required],
        });

        this.formatoCForm.get('titulo').disable();
        this.formReady.emit(this.formatoCForm);
    }

    onCancel() {
        this.router.navigate(['examen-de-valoracion/solicitud']);
    }

    onSave() {
        if (this.formatoCForm.invalid) {
            this.handleWarningMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS);
            return;
        } else {
            const data = document.getElementById('formatoC');
            this.pdfService.generatePDF(
                data,
                `${this.estudianteSeleccionado.codigo} - formatoC.pdf`
            );
            this.handleSuccessMessage(Mensaje.GUARDADO_EXITOSO);
        }
    }

    onFirmaJuradoChange(event: any) {
        const input = event && event.files ? event : { files: [] };

        const file = input.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                this.firmaJuradoImage = reader.result as string;
            };
            reader.readAsDataURL(file);

            this.formatoCForm.patchValue({ firmaJurado: file });
        }
    }

    updateControlNames(formArray: FormArray) {
        formArray.controls.forEach((control, index) => {
            const newControls = {};
            Object.keys(control.value).forEach((key) => {
                const newName = key.replace(/\d+$/, index.toString());
                newControls[newName] = control.get(key);
            });
            formArray.setControl(index, this.fb.group(newControls));
        });
    }

    addItem(formArrayName: string) {
        const item = this.fb.group({
            [formArrayName == 'observaciones'
                ? 'observacion' + this[formArrayName].length
                : 'recomendacion' + this[formArrayName].length]: [
                null,
                Validators.required,
            ],
        });
        this[formArrayName].push(item);
    }

    deleteItem(formArrayName: string): void {
        if (this[formArrayName].length > 1) {
            this[formArrayName].removeAt(this[formArrayName].length - 1);
            this.updateControlNames(this[formArrayName]);
        }
    }

    handlerResponseException(response: any) {
        if (response.status !== 501) return;

        const mapException = mapResponseException(response.error);
        mapException.forEach((value) => {
            this.messageService.add(errorMessage(value));
        });
    }

    setBreadcrumb() {
        this.breadcrumbService.setItems([
            { label: 'Trabajos de Grado' },
            {
                label: 'Examen de Valoracion',
                routerLink: 'examen-de-valoracion',
            },
            {
                label: 'Respuesta',
                routerLink: 'examen-de-valoracion/respuesta',
            },
        ]);
    }

    private handleSuccessMessage(message: string) {
        this.messageService.add(infoMessage(message));
    }

    private handleWarningMessage(message: string) {
        this.messageService.clear();
        this.messageService.add(warnMessage(message));
    }
}
