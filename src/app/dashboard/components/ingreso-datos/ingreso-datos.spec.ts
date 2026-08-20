import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { RefuelService } from '../../../services/refuel.service';
import { IngresoDatosComponent } from './ingreso-datos';

describe('IngresoDatosComponent', () => {
  let component: IngresoDatosComponent;
  let fixture: ComponentFixture<IngresoDatosComponent>;
  let addRecordMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    addRecordMock = vi.fn().mockResolvedValue({ success: true });

    await TestBed.configureTestingModule({
      imports: [IngresoDatosComponent],
      providers: [
        { provide: RefuelService, useValue: { addRecord: addRecordMock } }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IngresoDatosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const headerButton = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('.flex.items-center.gap-3 button');

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides the form by default and shows the add button', () => {
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(headerButton().textContent).toContain('Añadir Repostaje');
  });

  it('shows the form when the add button is clicked', () => {
    headerButton().click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
    expect(headerButton().textContent).toContain('Cancelar');
  });

  it('hides the form and clears messages when cancelled', () => {
    headerButton().click();
    fixture.detectChanges();
    component.errorMessage.set('previous error');

    headerButton().click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(component.errorMessage()).toBe('');
  });

  it('closes the form and shows the success message after a successful save', async () => {
    headerButton().click();
    fixture.detectChanges();

    component.fecha.set('2026-08-20');
    component.precioPorLitro.set(1.5);
    component.litros.set(10);
    component.total.set(15);

    await component.onSubmit();
    fixture.detectChanges();

    expect(addRecordMock).toHaveBeenCalled();
    expect(component.showForm()).toBe(false);
    expect(component.successMessage()).toContain('registrado correctamente');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('keeps the form open with an error message when the save fails', async () => {
    addRecordMock.mockResolvedValue({ success: false, message: 'boom' });
    headerButton().click();
    fixture.detectChanges();

    component.fecha.set('2026-08-20');
    component.precioPorLitro.set(1.5);
    component.litros.set(10);
    component.total.set(15);

    await component.onSubmit();
    fixture.detectChanges();

    expect(component.showForm()).toBe(true);
    expect(component.errorMessage()).toBe('boom');
    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
  });
});
