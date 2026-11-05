import { TestBed } from '@angular/core/testing';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EmptyState] }).compileComponents();
  });

  it('debe mostrar el mensaje', async () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('message', 'No hay productos para este filtro');
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No hay productos para este filtro',
    );
  });

  it('no debe mostrar botón cuando no hay actionLabel', async () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('message', 'Nada');
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Nada');
    expect(root.querySelector('button')).toBeNull();
  });

  it('debe mostrar la acción y emitir action al pulsarla', async () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('message', 'Nada');
    fixture.componentRef.setInput('actionLabel', 'Limpiar filtros');
    await fixture.whenStable();
    let emitted = 0;
    fixture.componentInstance.action.subscribe(() => emitted++);

    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button?.textContent.trim()).toBe('Limpiar filtros');
    expect(button?.getAttribute('type')).toBe('button');
    button?.click();

    expect(emitted).toBe(1);
  });
});
