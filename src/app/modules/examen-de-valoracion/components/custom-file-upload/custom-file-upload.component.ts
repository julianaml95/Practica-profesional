import {
    Component,
    EventEmitter,
    Input,
    Output,
    ViewChild,
    forwardRef,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { mapResponseException } from 'src/app/core/utils/exception-util';
import { errorMessage, infoMessage } from 'src/app/core/utils/message-util';
import { SolicitudService } from '../../services/solicitud.service';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';
import { MessageService } from 'primeng/api';
import { RespuestaService } from '../../services/respuesta.service';
import { Mensaje } from 'src/app/core/enums/enums';
import { FileUpload } from 'primeng/fileupload';

@Component({
    selector: 'app-custom-file-upload',
    templateUrl: './custom-file-upload.component.html',
    styleUrls: ['./custom-file-upload.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => CustomFileUploadComponent),
            multi: true,
        },
    ],
})
export class CustomFileUploadComponent implements ControlValueAccessor {
    @ViewChild('fileUpload') fileUpload!: FileUpload;
    @Input() evaluacionId: number;
    @Input() filename: string;
    @Input() arrayName: string;
    @Input() selected: any;
    @Output() archivoSeleccionado: EventEmitter<any> = new EventEmitter<any>();
    @Output() archivoDeseleccionado: EventEmitter<any> =
        new EventEmitter<any>();
    value: File | any = null;
    onChange: any = () => {};
    onTouched: any = () => {};

    constructor(
        private messageService: MessageService,
        private solicitudService: SolicitudService
    ) {}

    writeValue(value: any): void {
        this.value = value;
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        // Implementar según sea necesario
    }

    onFileChange(event: any) {
        const selectedFiles: FileList = event.files;

        if (selectedFiles && selectedFiles.length > 0) {
            const selectedFile = selectedFiles[0];
            const formatFilename = this.filename.slice(0, -1);
            this.solicitudService
                .uploadFile(
                    this.evaluacionId,
                    "evaluacionId",
                    selectedFile,
                    formatFilename
                )
                .subscribe({
                    next: () =>
                        this.messageService.add(
                            infoMessage(Mensaje.GUARDADO_EXITOSO)
                        ),
                    error: (e) => this.handlerResponseException(e),
                });
            this.selected[`${this.arrayName}.${this.filename}`] = selectedFile;
            this.archivoSeleccionado.emit([
                this.filename,
                selectedFile,
                this.arrayName,
            ]);
            this.onChange(selectedFile);
            this.onTouched();
            return selectedFile;
        }

        return null;
    }

    clearFile(): void {
        const formatFilename = this.filename.slice(0, -1);
        this.solicitudService
            .deleteFile(this.evaluacionId, "evaluacionId", formatFilename)
            .subscribe({
                next: () =>
                    this.messageService.add(
                        infoMessage(Mensaje.ARCHIVO_ELIMINADO_CORRECTAMENTE)
                    ),
                error: (e) => this.handlerResponseException(e),
            });
        this.selected[`${this.arrayName}.${this.filename}`] = null;
        this.archivoDeseleccionado.emit([this.filename, this.arrayName]);
        this.value = null;
        this.fileUpload.clear();
        this.onChange(null);
        this.onTouched();
    }

    handlerResponseException(response: any) {
        if (response.status != 501) return;
        const mapException = mapResponseException(response.error);
        mapException.forEach((value, _) => {
            this.messageService.add(errorMessage(value));
        });
    }
}
