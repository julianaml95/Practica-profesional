import {
    Component,
    EventEmitter,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, timer } from 'rxjs';
import { SolicitudService } from '../../services/solicitud.service';
import { FileUpload } from 'primeng/fileupload';
import { Estudiante } from '../../../gestion-estudiantes/models/estudiante';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';
import { mapResponseException } from 'src/app/core/utils/exception-util';
import {
    errorMessage,
    infoMessage,
    warnMessage,
} from 'src/app/core/utils/message-util';
import { SustentacionService } from '../../services/sustentacion.service';
import { Mensaje } from 'src/app/core/enums/enums';
import { Sustentacion } from '../../models/sustentacion';

@Component({
    selector: 'app-sustentacion-examen',
    templateUrl: './sustentacion-examen.component.html',
    styleUrls: ['./sustentacion-examen.component.scss'],
})
export class SustentacionExamenComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();
    private unsubscribe_sustentacion$ = new Subject<void>();

    @ViewChild('RemisionComite') RemisionComite!: FileUpload;
    @ViewChild('RemisionConcejo') RemisionConcejo!: FileUpload;
    @ViewChild('ConstanciaDocumento') ConstanciaDocumento!: FileUpload;
    @ViewChild('ActaSustentacion') ActaSustentacion!: FileUpload;
    @ViewChild('ActaSustentacionP') ActaSustentacionP!: FileUpload;
    @ViewChild('EstudioHVA') EstudioHVA!: FileUpload;

    FileRemisionComite: File | null;
    FileRemisionConcejo: File | null;
    FileConstanciaDocumento: File | null;
    FileActaSustentacion: File | null;
    FileActaSustentacionP: File | null;
    FileEstudioHVA: File | null;

    isLoading: boolean = false;
    editMode: boolean = false;

    trabajoDeGradoId: number;
    respuestaId: number;
    resolucionId: number;
    sustentacionId: number;

    sustentacionForm: FormGroup;

    tituloSeleccionado: string;
    estudianteSeleccionado: Estudiante = {};

    estados: string[] = ['Aprobado', 'No Aprobado'];

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private solicitudService: SolicitudService,
        private sustentacionService: SustentacionService,
        private breadcrumbService: BreadcrumbService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        this.initForm();
        this.subscribeToObservers();
        if (this.router.url.includes('editar')) {
            this.loadEditMode();
        }
        this.setBreadcrumb();
    }

    loadEditMode() {
        this.editMode = true;
        this.loadSustentacion();
    }

    initForm(): void {
        this.sustentacionForm = this.fb.group({
            idTrabajoGrados: [null, Validators.required],
            linkRemisionDocumentoFinal: ['', Validators.required],
            urlDocumentacion: ['', Validators.required],
            linkRemisionDocumentoFinalCF: ['', Validators.required],
            linkConstanciaDocumentoFinal: ['', Validators.required],
            linkActaSustentacion: [null, Validators.required],
            linkActaSustentacionPublica: ['', Validators.required],
            respuestaSustentacion: ['', Validators.required],
            linkEstudioHojaVidaAcademica: ['', Validators.required],
            numeroActaTrabajoFinal: ['', Validators.required],
            fechaActa: ['', Validators.required],
        });

        this.formReady.emit(this.sustentacionForm);
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
        this.solicitudService.trabajoSeleccionadoSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.sustentacionForm
                        .get('idTrabajoGrados')
                        .setValue(response.id);
                    this.trabajoDeGradoId = response.id;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.resolucionSeleccionadaSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.resolucionId = response.id;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.sustentacionSeleccionadaSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.sustentacionId = response.id;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
    }

    setup(fieldName: string) {
        if (Object.keys(this.estudianteSeleccionado).length > 0) {
            this.solicitudService
                .getFile(this.sustentacionForm.get(fieldName).value)
                .subscribe({
                    next: (response: any) => {
                        if (response) {
                            const byteCharacters = atob(response);
                            const byteNumbers = new Array(
                                byteCharacters.length
                            );
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const file = new File([byteArray], fieldName, {
                                type: response.type,
                            });
                            switch (fieldName) {
                                case 'linkRemisionDocumentoFinal':
                                    this.FileRemisionComite = file;
                                    break;
                                case 'linkRemisionDocumentoFinalCF':
                                    this.FileRemisionConcejo = file;
                                    break;
                                case 'linkConstanciaDocumentoFinal':
                                    this.FileConstanciaDocumento = file;
                                    break;
                                case 'linkActaSustentacion':
                                    this.FileActaSustentacion = file;
                                    break;
                                case 'linkActaSustentacionPublica':
                                    this.FileActaSustentacionP = file;
                                    break;
                                case 'linkEstudioHojaVidaAcademica':
                                    this.FileEstudioHVA = file;
                                    break;
                                default:
                                    break;
                            }
                        }
                    },
                    error: (e) => this.handlerResponseException(e),
                });
        }
    }

    setValuesForm(sustentacion: Sustentacion) {
        this.sustentacionForm.patchValue({
            ...sustentacion,
        });
    }

    loadSustentacion() {
        this.isLoading = true;
        this.sustentacionService
            .getSustentacionByTrabajo(this.trabajoDeGradoId)
            .subscribe({
                next: (response) => {
                    if (response) {
                        const data = response;
                        this.setValuesForm(data);
                        this.sustentacionForm
                            .get('idTrabajoGrados')
                            .setValue(this.trabajoDeGradoId);
                        const respuestaSustentacion =
                            data?.respuestaSustentacion == true
                                ? 'Aprobado'
                                : 'No Aprobado';
                        this.sustentacionForm
                            .get('respuestaSustentacion')
                            .setValue(respuestaSustentacion);
                        this.sustentacionForm
                            .get('numeroActaTrabajoFinal')
                            .setValue(Number(data?.numeroActaTrabajoFinal));
                        this.sustentacionForm
                            .get('fechaActa')
                            .setValue(
                                data?.fechaActa
                                    ? new Date(data.fechaActa)
                                    : null
                            );
                    }
                },
                error: (e) => this.handlerResponseException(e),
                complete: () => {
                    this.setup('linkRemisionDocumentoFinal');
                    this.setup('linkRemisionDocumentoFinalCF');
                    this.setup('linkConstanciaDocumentoFinal');
                    this.setup('linkActaSustentacion');
                    this.setup('linkActaSustentacionPublica');
                    this.setup('linkEstudioHojaVidaAcademica');
                    this.isLoading = false;
                },
            });
    }

    updateSustentacion(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        this.sustentacionId = id;
        this.isLoading = true;

        const formValue = { ...this.sustentacionForm.value };
        formValue.respuestaSustentacion =
            formValue.respuestaSustentacion === 'Aprobado' ? 1 : 0;

        this.sustentacionService
            .updateSustentacion(formValue, this.sustentacionId)
            .subscribe({
                next: (_) => {},
                error: (e) => this.handlerResponseException(e),
                complete: () => {
                    timer(2000).subscribe(() => {
                        this.isLoading = false;
                    });
                },
            });
    }

    createSustentacion(): void {
        this.isLoading = true;

        const formValue = { ...this.sustentacionForm.value };
        formValue.respuestaSustentacion =
            formValue.respuestaSustentacion === 'Aprobado' ? 1 : 0;

        this.sustentacionService.createSustentacion(formValue).subscribe({
            next: (response) => {
                if (response) {
                    this.solicitudService.setSustentacionSeleccionada(response);
                    timer(2000).subscribe(() => {
                        this.isLoading = false;
                        this.router.navigate([
                            `examen-de-valoracion/sustentacion/editar/${response.idSustentacionTI}`,
                        ]);
                    });
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
    }

    createOrUpdateSustentacion() {
        if (this.sustentacionForm.invalid) {
            this.messageService.clear();
            this.messageService.add(
                warnMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS)
            );
            return;
        }

        this.router.url.includes('editar')
            ? this.updateSustentacion()
            : this.createSustentacion();
    }

    ngOnDestroy() {
        this.unsubscribe_sustentacion$.next();
        this.unsubscribe_sustentacion$.complete();
    }

    onFileSelectFirst(event: any) {
        this.FileRemisionComite = this.uploadFileAndSetValue(
            'linkRemisionDocumentoFinal',
            event
        );
    }

    onFileSelectSecond(event: any) {
        this.FileRemisionConcejo = this.uploadFileAndSetValue(
            'linkRemisionDocumentoFinalCF',
            event
        );
    }

    onFileSelectThird(event: any) {
        this.FileConstanciaDocumento = this.uploadFileAndSetValue(
            'linkConstanciaDocumentoFinal',
            event
        );
    }

    onFileSelectFourth(event: any) {
        this.FileActaSustentacion = this.uploadFileAndSetValue(
            'linkActaSustentacion',
            event
        );
    }

    onFileSelectFifth(event: any) {
        this.FileActaSustentacionP = this.uploadFileAndSetValue(
            'linkActaSustentacionPublica',
            event
        );
    }

    onFileSelectSixth(event: any) {
        this.FileEstudioHVA = this.uploadFileAndSetValue(
            'linkEstudioHojaVidaAcademica',
            event
        );
    }

    onFileClear(field: string) {
        if (field == 'linkRemisionDocumentoFinal') {
            this.FileRemisionComite = null;
            this.RemisionComite.clear();
            this.sustentacionForm.get('linkRemisionDocumentoFinal').reset();
        }

        if (field == 'linkRemisionDocumentoFinalCF') {
            this.FileRemisionConcejo = null;
            this.RemisionConcejo.clear();
            this.sustentacionForm.get('linkRemisionDocumentoFinalCF').reset();
        }

        if (field == 'linkConstanciaDocumentoFinal') {
            this.FileConstanciaDocumento = null;
            this.ConstanciaDocumento.clear();
            this.sustentacionForm.get('linkConstanciaDocumentoFinal').reset();
        }

        if (field == 'linkActaSustentacion') {
            this.FileActaSustentacion = null;
            this.ActaSustentacion.clear();
            this.sustentacionForm.get('linkActaSustentacion').reset();
        }

        if (field == 'linkActaSustentacionPublica') {
            this.FileActaSustentacionP = null;
            this.ActaSustentacionP.clear();
            this.sustentacionForm.get('linkActaSustentacionPublica').reset();
        }

        if (field == 'linkEstudioHojaVidaAcademica') {
            this.FileEstudioHVA = null;
            this.EstudioHVA.clear();
            this.sustentacionForm.get('linkEstudioHojaVidaAcademica').reset();
        }
    }

    convertFileToBase64(file: File): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64String = reader.result as string;
                const base64 = base64String.split(',')[1];
                resolve(base64);
            };
            reader.onerror = (error) => {
                reject(error);
            };
            reader.readAsDataURL(file);
        });
    }

    uploadFileAndSetValue(fileControlName: string, event: any) {
        const selectedFiles: FileList = event.files;
        if (selectedFiles && selectedFiles.length > 0) {
            const selectedFile = selectedFiles[0];
            const fileType = selectedFile.type.split('/')[1];
            this.convertFileToBase64(selectedFile)
                .then((base64) => {
                    this.sustentacionForm
                        .get(fileControlName)
                        .setValue(`${fileControlName}.${fileType}-${base64}`);
                })
                .catch((error) => {
                    console.error(
                        'Error al convertir el archivo a base64:',
                        error
                    );
                });
            return selectedFile;
        }
        return null;
    }

    getFileAndSetValue(fieldName: string) {
        this.solicitudService
            .getFile(this.sustentacionForm.get(fieldName).value)
            .subscribe({
                next: (response: string) => {
                    const rutaArchivo =
                        this.sustentacionForm.get(fieldName).value;
                    const byteCharacters = atob(response);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray]);
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    const extension = rutaArchivo.slice(
                        rutaArchivo.lastIndexOf('.') + 1
                    );
                    document.body.appendChild(a);
                    a.style.display = 'none';
                    a.href = url;
                    a.download = fieldName + `.${extension}`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                },
                error: (response) => {
                    if (response) {
                        this.messageService.add(
                            warnMessage(
                                'Modifica la informacion para ver los cambios.'
                            )
                        );
                    }
                },
            });
    }

    redirectToSolicitud(trabajoDeGradoId: number) {
        this.router.navigate([
            `examen-de-valoracion/solicitud/editar/${trabajoDeGradoId}`,
        ]);
    }

    redirectToRespuesta(respuestaId: number) {
        respuestaId
            ? this.router.navigate([
                  `examen-de-valoracion/respuesta/editar/${respuestaId}`,
              ])
            : this.router.navigate(['examen-de-valoracion/respuesta']);
    }

    redirectToResolucion(resolucionId: number) {
        resolucionId
            ? this.router.navigate([
                  `examen-de-valoracion/resolucion/editar/${resolucionId}`,
              ])
            : this.router.navigate(['examen-de-valoracion/resolucion']);
    }

    redirectToBandeja() {
        this.router.navigate(['examen-de-valoracion']);
    }

    handlerResponseException(response: any) {
        // if (response.status != 501) return;
        // const mapException = mapResponseException(response.error);
        // mapException.forEach((value, _) => {
        //     this.messageService.add(errorMessage(value));
        // });
        this.messageService.add(
            errorMessage(response.error ? response.error : response)
        );
    }

    isActiveIndex(): Boolean {
        if (this.router.url.includes('sustentacion')) {
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
            { label: 'Sustentacion' },
        ]);
    }
}
