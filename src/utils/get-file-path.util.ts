export const getFileName = (file: Express.Multer.File) => {
    return file.filename;
};

export const getFilePath = (filename?: string | null) => {
    return filename ? `${process.env.APP_URL}/files/${filename}` : '';
};
