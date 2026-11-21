import { createAddCropHandler } from '@/services/fieldCropNavigation';

describe('field crop navigation', () => {
  it('creates a route for the selected field and no-ops without one', () => {
    const navigate = jest.fn();
    const openCropForm = createAddCropHandler({ id: 12 }, navigate);
    openCropForm();
    expect(navigate).toHaveBeenCalledWith({
      pathname: '/editar_crops',
      params: { id: '12' },
    });

    const noField = createAddCropHandler(null, navigate);
    noField();
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
