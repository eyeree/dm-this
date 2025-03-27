import torch

if torch.cuda.is_available():
    num_cuda_devices = torch.cuda.device_count()
    print(f"Number of CUDA devices: {num_cuda_devices}")
    for i in range(num_cuda_devices):
        print(f"CUDA device {i}: {torch.cuda.get_device_name(i)}")
else:
    print("CUDA is not available.")